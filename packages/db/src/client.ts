import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema/index.js';

export type Database = NodePgDatabase<typeof schema>;

let pool: Pool | undefined;

/** สร้าง (หรือคืน) instance ของ Drizzle db ที่ใช้ pool ร่วมกัน */
export function createDb(connectionString?: string): { db: Database; pool: Pool } {
  const url =
    connectionString ??
    process.env.DATABASE_URL ??
    'postgresql://otc:otc@localhost:5432/otc_consignment';

  if (!pool) {
    pool = new Pool({ connectionString: url });
  }
  const db = drizzle(pool, { schema, casing: 'snake_case' });
  return { db, pool };
}

export { schema };
