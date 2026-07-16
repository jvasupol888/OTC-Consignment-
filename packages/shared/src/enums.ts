/**
 * Enums — single source of truth ใช้ร่วมทั้ง DB (Drizzle pgEnum), API และ frontend
 * ทุกค่าเป็น UPPER_SNAKE_CASE มาตรฐานเดียว (แก้ความไม่สอดคล้องของระบบเดิม)
 */

export const USER_ROLES = ['SYSTEM_ADMIN', 'ADMIN', 'SALE'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const RECORD_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type RecordStatus = (typeof RECORD_STATUSES)[number];

export const LOCATION_TYPES = ['SALE', 'PHARMACY'] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export const DOC_TYPES = ['REQUEST', 'CONSIGN', 'SALE', 'RETURN'] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const RETURN_SUBTYPES = ['PHARMACY_TO_SALE', 'SALE_TO_COMPANY'] as const;
export type ReturnSubtype = (typeof RETURN_SUBTYPES)[number];

export const TXN_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;
export type TxnStatus = (typeof TXN_STATUSES)[number];

/** แมปค่าจากระบบเดิม (Google Apps Script) มาเป็นค่ามาตรฐานใหม่ */
export const LEGACY_ENUM_MAP = {
  docType: {
    Restock: 'REQUEST',
    Request: 'REQUEST',
    Consign: 'CONSIGN',
    Sale: 'SALE',
    Return: 'RETURN',
  },
  locationType: {
    Sale: 'SALE',
    Sale_Stock: 'SALE',
    Pharmacy: 'PHARMACY',
    Pharmacy_Stock: 'PHARMACY',
  },
  status: {
    Pending: 'PENDING',
    Approved: 'APPROVED',
    Rejected: 'REJECTED',
    Cansaleed: 'CANCELLED', // typo เดิม
    Cancelled: 'CANCELLED',
  },
  role: {
    OTC_Sale: 'SALE',
    Sale: 'SALE',
    Admin: 'ADMIN',
    System_Admin: 'SYSTEM_ADMIN',
  },
} as const;
