import { sql } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { Database } from '@otc/db';

/**
 * สร้างรหัสแบบเรียงลำดับ เช่น USR001, PRD007, STR012
 * นับจากค่า max ที่มีอยู่ของคอลัมน์ code (ต้องเรียกภายใน tx เพื่อกัน race)
 *
 * @param prefix   คำนำหน้า เช่น 'USR'
 * @param width    จำนวนหลักเลข (default 3)
 */
export async function nextCode(
  tx: Database,
  table: PgTable,
  codeColumn: PgColumn,
  prefix: string,
  width = 3,
): Promise<string> {
  // ดึงเลขสูงสุดจาก code ที่ขึ้นต้นด้วย prefix แล้ว +1
  const [row] = await tx
    .select({
      maxNum: sql<number>`COALESCE(MAX(CAST(NULLIF(REGEXP_REPLACE(${codeColumn}, '\\D', '', 'g'), '') AS INTEGER)), 0)`,
    })
    .from(table)
    .where(sql`${codeColumn} LIKE ${prefix + '%'}`);

  const next = (row?.maxNum ?? 0) + 1;
  return `${prefix}${String(next).padStart(width, '0')}`;
}
