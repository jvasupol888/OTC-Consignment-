import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // ใช้ schema ที่ compile แล้ว (dist) — เพราะ source ใช้ NodeNext ".js" specifiers
  // อย่าลืม `pnpm --filter @otc/db build` ก่อน generate/migrate
  schema: './dist/schema/index.js',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://otc:otc@localhost:5432/otc_consignment',
  },
  casing: 'snake_case',
  verbose: true,
  strict: true,
});
