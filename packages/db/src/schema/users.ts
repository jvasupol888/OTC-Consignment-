import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, AnyPgColumn } from 'drizzle-orm/pg-core';
import { userRoleEnum, recordStatusEnum } from './enums.js';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  code: text('code').notNull().unique(), // เช่น USR001 (อ่านง่าย)
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(), // Argon2id (ไม่เก็บ plaintext)
  fullName: text('full_name').notNull(),
  role: userRoleEnum('role').notNull(),
  status: recordStatusEnum('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid('updated_by').references((): AnyPgColumn => users.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
