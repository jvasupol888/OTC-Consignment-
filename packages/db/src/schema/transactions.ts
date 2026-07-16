import { sql, relations } from 'drizzle-orm';
import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { docTypeEnum, returnSubtypeEnum, txnStatusEnum } from './enums.js';
import { users } from './users.js';
import { stores } from './stores.js';
import { products } from './products.js';

/** หัวเอกสารธุรกรรม (1 ใบ = หลาย line ได้) */
export const transactionDocs = pgTable(
  'transaction_docs',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    docNo: text('doc_no').notNull().unique(), // TXN-YYYYMMDD-XXXX
    docType: docTypeEnum('doc_type').notNull(),
    returnSubtype: returnSubtypeEnum('return_subtype'), // เฉพาะ RETURN
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id), // พนักงานขายที่ทำรายการ
    storeId: uuid('store_id').references(() => stores.id), // ร้านยาที่เกี่ยวข้อง (ถ้ามี)
    status: txnStatusEnum('status').notNull().default('PENDING'),
    evidenceKey: text('evidence_key'), // S3 object key ของสลิป
    remark: text('remark'),
    approvedBy: uuid('approved_by').references(() => users.id),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_txn_status').on(t.status),
    index('idx_txn_created_by').on(t.createdBy),
  ],
);

/** บรรทัดสินค้าในเอกสาร */
export const transactionLines = pgTable('transaction_lines', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  docId: uuid('doc_id')
    .notNull()
    .references(() => transactionDocs.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  quantity: integer('quantity').notNull(),
});

export const transactionDocsRelations = relations(transactionDocs, ({ many, one }) => ({
  lines: many(transactionLines),
  creator: one(users, { fields: [transactionDocs.createdBy], references: [users.id] }),
  store: one(stores, { fields: [transactionDocs.storeId], references: [stores.id] }),
}));

export const transactionLinesRelations = relations(transactionLines, ({ one }) => ({
  doc: one(transactionDocs, {
    fields: [transactionLines.docId],
    references: [transactionDocs.id],
  }),
  product: one(products, {
    fields: [transactionLines.productId],
    references: [products.id],
  }),
}));

export type TransactionDoc = typeof transactionDocs.$inferSelect;
export type NewTransactionDoc = typeof transactionDocs.$inferInsert;
export type TransactionLine = typeof transactionLines.$inferSelect;
export type NewTransactionLine = typeof transactionLines.$inferInsert;
