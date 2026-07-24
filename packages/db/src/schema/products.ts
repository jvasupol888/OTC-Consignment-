import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, numeric, date, timestamp } from 'drizzle-orm/pg-core';
import { recordStatusEnum } from './enums.js';
import { users } from './users.js';

export const products = pgTable('products', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  code: text('code').notNull().unique(), // เช่น PRD001
  sku: text('sku').notNull().unique(), // ป้องกัน import ซ้ำ
  name: text('name').notNull(),
  price: numeric('price', { precision: 12, scale: 2 }).notNull().default('0'),
  startDate: date('start_date'),
  endDate: date('end_date'), // ใช้แจ้งเตือนหมดอายุ/สิ้นสุดไตรมาส
  status: recordStatusEnum('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
