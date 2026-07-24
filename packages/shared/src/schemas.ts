/**
 * Zod validation schemas — ใช้ validate ที่ API (DTO) และ frontend (form) ร่วมกัน
 */
import { z } from 'zod';
import {
  USER_ROLES,
  RECORD_STATUSES,
  LOCATION_TYPES,
  DOC_TYPES,
  RETURN_SUBTYPES,
} from './enums.js';

// ---------- Auth ----------
export const loginSchema = z.object({
  username: z.string().min(1, 'กรุณากรอกชื่อผู้ใช้'),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ---------- Master Data ----------
export const upsertUserSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1, 'กรุณาระบุรหัสพนักงาน').max(50),
  username: z.string().min(3).max(50),
  password: z.string().min(6).optional(), // optional ตอนแก้ไข (ไม่เปลี่ยนรหัส)
  fullName: z.string().min(1).max(120),
  role: z.enum(USER_ROLES),
  status: z.enum(RECORD_STATUSES).default('ACTIVE'),
});
export type UpsertUserInput = z.infer<typeof upsertUserSchema>;

export const upsertProductSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().min(1).max(60),
  name: z.string().min(1).max(200),
  price: z.number().nonnegative(),
  startDate: z.string().date().optional().nullable(),
  endDate: z.string().date().optional().nullable(),
  status: z.enum(RECORD_STATUSES).default('ACTIVE'),
});
export type UpsertProductInput = z.infer<typeof upsertProductSchema>;

export const upsertStoreSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  location: z.string().max(500).optional().nullable(),
  province: z.string().max(100).optional().nullable(),
  storageLocation: z.string().max(200).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  assignedUserId: z.string().uuid().nullable(),
  status: z.enum(RECORD_STATUSES).default('ACTIVE'),
});
export type UpsertStoreInput = z.infer<typeof upsertStoreSchema>;

export const transferStoreSchema = z.object({
  storeId: z.string().uuid(),
  newUserId: z.string().uuid(),
});
export type TransferStoreInput = z.infer<typeof transferStoreSchema>;

// ---------- Transactions ----------
export const transactionLineSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive('จำนวนต้องมากกว่า 0'),
});
export type TransactionLineInput = z.infer<typeof transactionLineSchema>;

export const submitTransactionSchema = z
  .object({
    docType: z.enum(DOC_TYPES),
    returnSubtype: z.enum(RETURN_SUBTYPES).optional().nullable(),
    storeId: z.string().uuid().optional().nullable(),
    lines: z.array(transactionLineSchema).min(1, 'ต้องมีสินค้าอย่างน้อย 1 รายการ'),
    evidenceKey: z.string().optional().nullable(), // S3 object key จาก presign
    remark: z.string().max(500).optional().nullable(),
  })
  .superRefine((val, ctx) => {
    // REQUEST: ไม่ต้องมี store; ประเภทอื่นที่ยุ่งกับร้านยาต้องมี store
    const needsStore =
      val.docType === 'CONSIGN' ||
      val.docType === 'SALE' ||
      (val.docType === 'RETURN' && val.returnSubtype === 'PHARMACY_TO_SALE');
    if (needsStore && !val.storeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['storeId'],
        message: 'ต้องระบุร้านยาสำหรับรายการประเภทนี้',
      });
    }
    // RETURN ต้องมี subtype
    if (val.docType === 'RETURN' && !val.returnSubtype) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['returnSubtype'],
        message: 'ต้องระบุประเภทการคืน',
      });
    }
    // SALE (ขายจริง) ต้องแนบสลิป
    if (val.docType === 'SALE' && !val.evidenceKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['evidenceKey'],
        message: 'การขายจริงต้องแนบรูปสลิปหลักฐาน',
      });
    }
  });
export type SubmitTransactionInput = z.infer<typeof submitTransactionSchema>;

export const rejectTransactionSchema = z.object({
  remark: z.string().min(1, 'กรุณาระบุเหตุผลการปฏิเสธ').max(500),
});
export type RejectTransactionInput = z.infer<typeof rejectTransactionSchema>;

// ---------- Files ----------
export const presignUploadSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().regex(/^image\//, 'รองรับเฉพาะไฟล์รูปภาพ'),
});
export type PresignUploadInput = z.infer<typeof presignUploadSchema>;
