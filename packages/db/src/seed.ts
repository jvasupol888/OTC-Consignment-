import 'dotenv/config';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { createDb } from './client.js';
import { users } from './schema/index.js';

/**
 * Seed ข้อมูลเริ่มต้น — สร้างบัญชี System Admin ถ้ายังไม่มี
 * รัน: pnpm --filter @otc/db seed
 */
async function main() {
  const { db, pool } = createDb();

  const username = process.env.SEED_ADMIN_USERNAME ?? 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'admin1234';

  const existing = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (existing) {
    console.log(`✓ admin user "${username}" มีอยู่แล้ว — ข้าม`);
  } else {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await db.insert(users).values({
      code: 'USR001',
      username,
      passwordHash,
      fullName: 'System Administrator',
      role: 'SYSTEM_ADMIN',
      status: 'ACTIVE',
    });
    console.log(`✓ สร้างบัญชี admin: ${username} / ${password}`);
  }

  await pool.end();
  console.log('Seed เสร็จสมบูรณ์');
}

main().catch((err) => {
  console.error('Seed ล้มเหลว:', err);
  process.exit(1);
});
