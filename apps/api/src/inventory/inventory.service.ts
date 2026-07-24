import { Injectable, Inject } from '@nestjs/common';
import { and, eq, sql, or, inArray } from 'drizzle-orm';
import { inventory, stores, transactionDocs, transactionLines, type Database } from '@otc/db';
import { computeApprovalDeltas, type StockDelta } from '@otc/shared';
import { DATABASE } from '../db/db.module.js';

/**
 * จัดการยอดสต็อกใน tb_inventory
 * เมธอด apply* ต้องถูกเรียก "ภายใน" transaction ของ state machine เท่านั้น
 */
@Injectable()
export class InventoryService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** เงื่อนไขระบุแถวสต็อกตาม delta */
  private locWhere(d: StockDelta) {
    return d.locationType === 'SALE'
      ? and(
          eq(inventory.productId, d.productId),
          eq(inventory.locationType, 'SALE'),
          eq(inventory.saleUserId, d.locationRefId),
        )
      : and(
          eq(inventory.productId, d.productId),
          eq(inventory.locationType, 'PHARMACY'),
          eq(inventory.storeId, d.locationRefId),
        );
  }

  /** ล็อกแถว + คืนยอดปัจจุบัน (0 ถ้ายังไม่มี) — ต้องอยู่ใน tx */
  async lockAndGetQty(tx: Database, d: StockDelta): Promise<number> {
    const rows = await tx
      .select({ quantity: inventory.quantity })
      .from(inventory)
      .where(this.locWhere(d))
      .for('update');
    return rows[0]?.quantity ?? 0;
  }

  /** upsert ยอดสต็อกตาม delta — ต้องอยู่ใน tx */
  async applyDelta(tx: Database, d: StockDelta): Promise<void> {
    const existing = await tx
      .select({ id: inventory.id, quantity: inventory.quantity })
      .from(inventory)
      .where(this.locWhere(d))
      .for('update');

    if (existing[0]) {
      await tx
        .update(inventory)
        .set({ quantity: existing[0].quantity + d.delta, updatedAt: new Date() })
        .where(eq(inventory.id, existing[0].id));
    } else {
      await tx.insert(inventory).values({
        productId: d.productId,
        locationType: d.locationType,
        saleUserId: d.locationType === 'SALE' ? d.locationRefId : null,
        storeId: d.locationType === 'PHARMACY' ? d.locationRefId : null,
        quantity: d.delta,
      });
    }
  }

  private async getReservedQuantities() {
    const pendingDocs = await this.db
      .select({
        id: transactionDocs.id,
        docType: transactionDocs.docType,
        returnSubtype: transactionDocs.returnSubtype,
        createdBy: transactionDocs.createdBy,
        storeId: transactionDocs.storeId,
      })
      .from(transactionDocs)
      .where(eq(transactionDocs.status, 'PENDING'));

    if (pendingDocs.length === 0) return new Map<string, number>();

    const docIds = pendingDocs.map((d) => d.id);
    const lines = await this.db
      .select({
        docId: transactionLines.docId,
        productId: transactionLines.productId,
        quantity: transactionLines.quantity,
      })
      .from(transactionLines)
      .where(inArray(transactionLines.docId, docIds));

    const map = new Map<string, number>();

    for (const doc of pendingDocs) {
      const docLines = lines.filter((l) => l.docId === doc.id);
      const deltas = computeApprovalDeltas(doc as any, docLines as any);
      for (const d of deltas) {
        if (d.delta < 0) {
          const key = `${d.locationType}|${d.locationRefId}|${d.productId}`;
          const current = map.get(key) || 0;
          map.set(key, current + Math.abs(d.delta));
        }
      }
    }

    return map;
  }

  /** query สต็อกสำหรับแสดงผล (admin เห็นหมด / sale ถูกกรอง) */
  async list(filter: { locationType?: 'SALE' | 'PHARMACY'; saleUserId?: string }) {
    const conds = [];
    if (filter.locationType) conds.push(eq(inventory.locationType, filter.locationType));
    if (filter.saleUserId) conds.push(eq(inventory.saleUserId, filter.saleUserId));
    
    const items = await this.db
      .select()
      .from(inventory)
      .where(conds.length ? and(...conds) : sql`true`);
      
    const reservedMap = await this.getReservedQuantities();
    return items.map(item => {
      const refId = item.locationType === 'SALE' ? item.saleUserId : item.storeId;
      const key = `${item.locationType}|${refId}|${item.productId}`;
      const reservedQuantity = reservedMap.get(key) || 0;
      return { ...item, reservedQuantity };
    });
  }

  /** ดึงสต็อกทั้งหมดที่เกี่ยวข้องกับเซลล์ (SALE ของตัวเอง + PHARMACY ของร้านที่ดูแล) */
  async listForSaleAgent(userId: string) {
    const assignedStores = await this.db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.assignedUserId, userId));
    const storeIds = assignedStores.map((s) => s.id);

    const orConds = [
      and(eq(inventory.locationType, 'SALE'), eq(inventory.saleUserId, userId))
    ];
    
    if (storeIds.length > 0) {
      console.log('listForSaleAgent: storeIds =', storeIds);
      orConds.push(
        and(eq(inventory.locationType, 'PHARMACY'), inArray(inventory.storeId, storeIds))
      );
    }

    const items = await this.db
      .select()
      .from(inventory)
      .where(or(...orConds));
      
    const reservedMap = await this.getReservedQuantities();
    return items.map(item => {
      const refId = item.locationType === 'SALE' ? item.saleUserId : item.storeId;
      const key = `${item.locationType}|${refId}|${item.productId}`;
      const reservedQuantity = reservedMap.get(key) || 0;
      return { ...item, reservedQuantity };
    });
  }
}
