import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { products, stores, users, type Database } from '@otc/db';
import { upsertProductSchema, upsertStoreSchema } from '@otc/shared';
import { DATABASE } from '../db/db.module.js';
import { ProductsService } from '../products/products.service.js';
import { StoresService } from '../stores/stores.service.js';
import { TransactionsService } from '../transactions/transactions.service.js';
import type { SlipData } from './pdf.service.js';

export interface ImportResult {
  inserted: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

@Injectable()
export class ReportsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly productsSvc: ProductsService,
    private readonly storesSvc: StoresService,
    private readonly txns: TransactionsService,
  ) {}

  // ---------- EXPORT rows ----------
  async productRows() {
    const rows = await this.db.select().from(products).orderBy(asc(products.code));
    return rows.map((p) => ({
      code: p.code,
      sku: p.sku,
      name: p.name,
      price: Number(p.price),
      startDate: p.startDate ?? '',
      endDate: p.endDate ?? '',
      status: p.status,
    }));
  }

  async storeRows() {
    const rows = await this.db
      .select({
        code: stores.code,
        name: stores.name,
        location: stores.location,
        assignedUsername: users.username,
        assignedUserName: users.fullName,
      })
      .from(stores)
      .leftJoin(users, eq(stores.assignedUserId, users.id))
      .orderBy(asc(stores.code));
    return rows.map((s) => ({
      code: s.code,
      name: s.name,
      location: s.location ?? '',
      assignedUsername: s.assignedUsername ?? '',
      assignedUserName: s.assignedUserName ?? '',
    }));
  }

  // ---------- IMPORT ----------
  async importProducts(rows: Record<string, string>[]): Promise<ImportResult> {
    const res: ImportResult = { inserted: 0, skipped: 0, errors: [] };
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!;
      try {
        const parsed = upsertProductSchema.parse({
          sku: r.sku ?? r.SKU,
          name: r.name ?? r.ProductName ?? r.ชื่อสินค้า,
          price: Number(r.price ?? r.Price ?? 0),
          startDate: emptyToNull(r.startDate ?? r.StartDate),
          endDate: emptyToNull(r.endDate ?? r.EndDate),
          status: (r.status ?? 'ACTIVE').toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        });
        await this.productsSvc.upsert(parsed);
        res.inserted++;
      } catch (e) {
        // SKU ซ้ำ = ข้าม; อื่น ๆ = error
        if ((e as Error).message?.includes('ถูกใช้แล้ว')) res.skipped++;
        else res.errors.push({ row: i + 2, message: (e as Error).message });
      }
    }
    return res;
  }

  async importStores(rows: Record<string, string>[]): Promise<ImportResult> {
    const res: ImportResult = { inserted: 0, skipped: 0, errors: [] };
    // map username -> userId, และรายชื่อร้านที่มีอยู่ (กันชื่อซ้ำ)
    const allUsers = await this.db
      .select({ id: users.id, username: users.username })
      .from(users);
    const userMap = new Map(allUsers.map((u) => [u.username.toLowerCase(), u.id]));
    const existing = new Set(
      (await this.db.select({ name: stores.name }).from(stores)).map((s) => s.name.toLowerCase()),
    );

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!;
      try {
        const name = r.name ?? r.StoreName ?? r.ชื่อร้าน ?? '';
        if (existing.has(name.toLowerCase())) {
          res.skipped++;
          continue;
        }
        const uname = (r.assignedUsername ?? r.Assigned_Username ?? '').toLowerCase();
        const assignedUserId = uname ? userMap.get(uname) ?? null : null;
        const parsed = upsertStoreSchema.parse({
          name,
          location: emptyToNull(r.location ?? r.Location),
          assignedUserId,
        });
        await this.storesSvc.upsert(parsed);
        existing.add(name.toLowerCase());
        res.inserted++;
      } catch (e) {
        res.errors.push({ row: i + 2, message: (e as Error).message });
      }
    }
    return res;
  }

  // ---------- SLIP data ----------
  async slipData(docNo: string): Promise<SlipData> {
    const [doc] = await this.txns.list({ docNo });
    if (!doc) throw new NotFoundException(`ไม่พบเอกสาร ${docNo}`);
    return {
      docNo: doc.docNo,
      docType: doc.docType,
      returnSubtype: doc.returnSubtype,
      status: doc.status,
      createdByName: doc.createdBy.name,
      storeName: doc.store?.name ?? null,
      createdAt: doc.createdAt,
      remark: doc.remark,
      lines: doc.lines.map((l) => ({
        productCode: l.productCode,
        productName: l.productName,
        quantity: l.quantity,
      })),
    };
  }
}

function emptyToNull(v: string | undefined): string | null {
  const s = (v ?? '').trim();
  return s === '' ? null : s;
}
