import { pgEnum } from 'drizzle-orm/pg-core';
import {
  USER_ROLES,
  RECORD_STATUSES,
  LOCATION_TYPES,
  DOC_TYPES,
  RETURN_SUBTYPES,
  TXN_STATUSES,
} from '@otc/shared';

// pgEnum ต้องการ tuple แบบ [string, ...string[]] — const array จาก @otc/shared ให้ค่าเดียวกัน
export const userRoleEnum = pgEnum('user_role', USER_ROLES);
export const recordStatusEnum = pgEnum('record_status', RECORD_STATUSES);
export const locationTypeEnum = pgEnum('location_type', LOCATION_TYPES);
export const docTypeEnum = pgEnum('doc_type', DOC_TYPES);
export const returnSubtypeEnum = pgEnum('return_subtype', RETURN_SUBTYPES);
export const txnStatusEnum = pgEnum('txn_status', TXN_STATUSES);
