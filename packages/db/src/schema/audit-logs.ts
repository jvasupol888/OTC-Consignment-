import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tableName: text('table_name').notNull(), // เช่น 'products', 'stores', 'transactions' (การอนุมัติ)
  recordId: text('record_id').notNull(), // ID ของ record ที่ถูกแก้ไขหรือจัดการ
  action: text('action').notNull(), // เช่น 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT'
  oldData: jsonb('old_data'), // ข้อมูลก่อนหน้า
  newData: jsonb('new_data'), // ข้อมูลที่อัปเดตแล้ว
  userId: uuid('user_id').references(() => users.id).notNull(), // ผู้ที่ทำรายการแก้ไขล่าสุด
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), // เวลาที่แก้ไขล่าสุด
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
