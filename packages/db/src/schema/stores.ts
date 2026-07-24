import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { recordStatusEnum } from './enums.js';

export const stores = pgTable('stores', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  code: text('code').notNull().unique(), // เช่น STR001
  name: text('name').notNull(),
  location: text('location'),
  province: text('province'),
  storageLocation: text('storage_location'),
  phone: text('phone'),
  // เซลล์ที่ดูแลร้านนี้ — โอนย้ายได้ (row-level security ผูกกับคอลัมน์นี้)
  assignedUserId: uuid('assigned_user_id').references(() => users.id),
  status: recordStatusEnum('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Store = typeof stores.$inferSelect;
export type NewStore = typeof stores.$inferInsert;
