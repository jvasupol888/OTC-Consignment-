import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import {
  transactionDocs,
  transactionLines,
  stockMovements,
  type Database,
} from '@otc/db';
import {
  computeApprovalDeltas,
  computeRollbackDeltas,
  type SubmitTransactionInput,
  type StockDelta,
  type TxnContext,
} from '@otc/shared';
import { DATABASE } from '../db/db.module.js';
import { InventoryService } from '../inventory/inventory.service.js';
import type { AuthUser } from '../auth/decorators.js';

@Injectable()
export class TransactionsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly inventory: InventoryService,
  ) {}

  // ---------------------------------------------------------------
  // SUBMIT — เซลล์ส่งรายการ → สถานะ PENDING (ยังไม่แตะสต็อก)
  // ---------------------------------------------------------------
  async submit(user: AuthUser, input: SubmitTransactionInput) {
    return this.db.transaction(async (tx) => {
      const docNo = await this.nextDocNo(tx);
      const [doc] = await tx
        .insert(transactionDocs)
        .values({
          docNo,
          docType: input.docType,
          returnSubtype: input.returnSubtype ?? null,
          createdBy: user.sub, // ผูกจาก JWT — client ปลอมไม่ได้
          storeId: input.storeId ?? null,
          status: 'PENDING',
          evidenceKey: input.evidenceKey ?? null,
          remark: input.remark ?? null,
        })
        .returning();

      await tx.insert(transactionLines).values(
        input.lines.map((l) => ({
          docId: doc!.id,
          productId: l.productId,
          quantity: l.quantity,
        })),
      );

      return { docNo, id: doc!.id, status: doc!.status };
    });
  }

  // ---------------------------------------------------------------
  // APPROVE — รัน Inventory State Machine ภายใน transaction + row lock
  // ---------------------------------------------------------------
  async approve(docNo: string, admin: AuthUser) {
    return this.db.transaction(async (tx) => {
      const doc = await this.loadDoc(tx, docNo);
      if (doc.status !== 'PENDING')
        throw new ConflictException(`เอกสาร ${docNo} ไม่ได้อยู่สถานะรออนุมัติ`);

      const deltas = computeApprovalDeltas(this.ctx(doc), doc.lines);
      await this.applyDeltas(tx, deltas, doc.id, 'APPROVE');

      await tx
        .update(transactionDocs)
        .set({ status: 'APPROVED', approvedBy: admin.sub, approvedAt: new Date() })
        .where(eq(transactionDocs.id, doc.id));

      return { docNo, status: 'APPROVED' as const };
    });
  }

  // ---------------------------------------------------------------
  // REJECT — ปฏิเสธ (ไม่แตะสต็อก) + เหตุผล
  // ---------------------------------------------------------------
  async reject(docNo: string, admin: AuthUser, remark: string) {
    const doc = await this.loadDoc(this.db, docNo);
    if (doc.status !== 'PENDING')
      throw new ConflictException(`เอกสาร ${docNo} ไม่ได้อยู่สถานะรออนุมัติ`);

    await this.db
      .update(transactionDocs)
      .set({ status: 'REJECTED', approvedBy: admin.sub, approvedAt: new Date(), remark })
      .where(eq(transactionDocs.id, doc.id));

    return { docNo, status: 'REJECTED' as const };
  }

  // ---------------------------------------------------------------
  // CANCEL — ถ้า APPROVED แล้วต้อง rollback สต็อกกลับ (inverse)
  // ---------------------------------------------------------------
  async cancel(docNo: string, admin: AuthUser, remark?: string) {
    return this.db.transaction(async (tx) => {
      const doc = await this.loadDoc(tx, docNo);
      if (doc.status === 'CANCELLED')
        throw new ConflictException(`เอกสาร ${docNo} ถูกยกเลิกไปแล้ว`);
      if (doc.status === 'REJECTED')
        throw new ConflictException(`เอกสาร ${docNo} ถูกปฏิเสธไปแล้ว`);

      if (doc.status === 'APPROVED') {
        const deltas = computeRollbackDeltas(this.ctx(doc), doc.lines);
        await this.applyDeltas(tx, deltas, doc.id, 'ROLLBACK');
      }

      await tx
        .update(transactionDocs)
        .set({
          status: 'CANCELLED',
          approvedBy: admin.sub,
          approvedAt: new Date(),
          remark: remark ?? doc.remark,
        })
        .where(eq(transactionDocs.id, doc.id));

      return { docNo, status: 'CANCELLED' as const, rolledBack: doc.status === 'APPROVED' };
    });
  }

  // ================= helpers =================

  /** โหลดหัวเอกสาร + line (ล็อกหัวเอกสารกัน race) */
  private async loadDoc(tx: Database, docNo: string) {
    const rows = await tx
      .select()
      .from(transactionDocs)
      .where(eq(transactionDocs.docNo, docNo))
      .for('update');
    const head = rows[0];
    if (!head) throw new NotFoundException(`ไม่พบเอกสาร ${docNo}`);

    const lines = await tx
      .select({ productId: transactionLines.productId, quantity: transactionLines.quantity })
      .from(transactionLines)
      .where(eq(transactionLines.docId, head.id));

    return { ...head, lines };
  }

  private ctx(doc: {
    docType: TxnContext['docType'];
    returnSubtype: TxnContext['returnSubtype'];
    createdBy: string;
    storeId: string | null;
  }): TxnContext {
    return {
      docType: doc.docType,
      returnSubtype: doc.returnSubtype,
      createdBy: doc.createdBy,
      storeId: doc.storeId,
    };
  }

  /** ตรวจสต็อกพอ (ล็อกแถว) แล้วค่อย apply + บันทึก ledger — atomic */
  private async applyDeltas(
    tx: Database,
    deltas: StockDelta[],
    docId: string,
    reason: 'APPROVE' | 'ROLLBACK',
  ) {
    // 1) รวม delta ต่อ location เดียวกัน (กันล็อกซ้ำ/หักลบไม่ครบ)
    const merged = this.mergeDeltas(deltas);

    // 2) ตรวจว่าไม่มีสต็อกใดติดลบ (ล็อกแถวก่อน)
    for (const d of merged) {
      const current = await this.inventory.lockAndGetQty(tx, d);
      if (current + d.delta < 0) {
        throw new BadRequestException(
          `สต็อกไม่พอ: สินค้า ${d.productId} ที่ ${d.locationType} ` +
            `(คงเหลือ ${current}, ต้องปรับ ${d.delta})`,
        );
      }
    }

    // 3) เขียนจริง + ledger
    for (const d of merged) {
      await this.inventory.applyDelta(tx, d);
      await tx.insert(stockMovements).values({
        docId,
        productId: d.productId,
        locationType: d.locationType,
        locationRefId: d.locationRefId,
        delta: d.delta,
        reason,
      });
    }
  }

  private mergeDeltas(deltas: StockDelta[]): StockDelta[] {
    const map = new Map<string, StockDelta>();
    for (const d of deltas) {
      const key = `${d.locationType}|${d.locationRefId}|${d.productId}`;
      const prev = map.get(key);
      if (prev) prev.delta += d.delta;
      else map.set(key, { ...d });
    }
    return [...map.values()].filter((d) => d.delta !== 0);
  }

  /** สร้างเลขเอกสาร TXN-YYYYMMDD-XXXX (นับต่อวัน) */
  private async nextDocNo(tx: Database): Promise<string> {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const prefix = `TXN-${y}${m}${d}`;

    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(transactionDocs)
      .where(sql`${transactionDocs.docNo} LIKE ${prefix + '%'}`);

    return `${prefix}-${String((count ?? 0) + 1).padStart(4, '0')}`;
  }
}
