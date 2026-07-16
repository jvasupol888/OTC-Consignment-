import { sql } from 'drizzle-orm';
import { pgTable, uuid, integer, timestamp, text, index } from 'drizzle-orm/pg-core';
import { locationTypeEnum } from './enums.js';
import { transactionDocs } from './transactions.js';
import { products } from './products.js';

/**
 * Append-only ledger — บันทึกทุกการเคลื่อนไหวสต็อก (audit trail)
 * ระบบเดิมไม่มี ทำให้ตรวจย้อนหลังไม่ได้ ตารางนี้ทำให้ recompute/ตรวจสอบ inventory ได้เสมอ
 */
export const stockMovements = pgTable(
  'stock_movements',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    docId: uuid('doc_id')
      .notNull()
      .references(() => transactionDocs.id),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    locationType: locationTypeEnum('location_type').notNull(),
    locationRefId: uuid('location_ref_id').notNull(), // userId หรือ storeId
    delta: integer('delta').notNull(), // +เพิ่ม / -ลด
    reason: text('reason').notNull().default('APPROVE'), // APPROVE | ROLLBACK
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_mov_doc').on(t.docId)],
);

export type StockMovement = typeof stockMovements.$inferSelect;
export type NewStockMovement = typeof stockMovements.$inferInsert;
