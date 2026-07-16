import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  integer,
  timestamp,
  check,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { locationTypeEnum } from './enums.js';
import { products } from './products.js';
import { users } from './users.js';
import { stores } from './stores.js';

/**
 * สต็อก 2 ระดับ (SALE / PHARMACY) — ยอดคงเหลือปัจจุบัน (materialized)
 * แทน LocationID polymorphic เดิม ด้วยคอลัมน์แยก + CHECK + partial unique index
 */
export const inventory = pgTable(
  'inventory',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    locationType: locationTypeEnum('location_type').notNull(),
    saleUserId: uuid('sale_user_id').references(() => users.id), // set เมื่อ SALE
    storeId: uuid('store_id').references(() => stores.id), // set เมื่อ PHARMACY
    quantity: integer('quantity').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('inv_qty_nonneg', sql`${t.quantity} >= 0`),
    check(
      'inv_loc_consistency',
      sql`(${t.locationType} = 'SALE' AND ${t.saleUserId} IS NOT NULL AND ${t.storeId} IS NULL)
          OR (${t.locationType} = 'PHARMACY' AND ${t.storeId} IS NOT NULL AND ${t.saleUserId} IS NULL)`,
    ),
    uniqueIndex('uq_inv_sale')
      .on(t.productId, t.saleUserId)
      .where(sql`${t.locationType} = 'SALE'`),
    uniqueIndex('uq_inv_pharmacy')
      .on(t.productId, t.storeId)
      .where(sql`${t.locationType} = 'PHARMACY'`),
  ],
);

export type Inventory = typeof inventory.$inferSelect;
export type NewInventory = typeof inventory.$inferInsert;
