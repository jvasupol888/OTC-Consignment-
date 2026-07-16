import { Injectable, Inject } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { inventory, type Database } from '@otc/db';
import type { StockDelta } from '@otc/shared';
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

  /** query สต็อกสำหรับแสดงผล (admin เห็นหมด / sale ถูกกรอง) */
  async list(filter: { locationType?: 'SALE' | 'PHARMACY'; saleUserId?: string }) {
    const conds = [];
    if (filter.locationType) conds.push(eq(inventory.locationType, filter.locationType));
    if (filter.saleUserId) conds.push(eq(inventory.saleUserId, filter.saleUserId));
    return this.db
      .select()
      .from(inventory)
      .where(conds.length ? and(...conds) : sql`true`);
  }
}
