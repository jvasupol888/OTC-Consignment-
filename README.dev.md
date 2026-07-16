# OTC Consignment — คู่มือนักพัฒนา (Monorepo)

ระบบฝากขาย OTC เวอร์ชันใหม่ · PostgreSQL + NestJS + Next.js + React Native
ดูภาพรวมการออกแบบที่ [ARCHITECTURE.md](ARCHITECTURE.md)

## โครงสร้าง

```
apps/
  api/      NestJS backend (auth, transactions state-machine, inventory)
  admin/    Next.js 15 (Admin Panel)
  mobile/   Expo / React Native (Sale App)
packages/
  db/       Drizzle schema + migrations + seed
  shared/   Zod schemas + enums + state-machine (pure)
  config/   tsconfig ร่วม
```

## สิ่งที่ต้องมี

- Node.js ≥ 20 (มี 24 อยู่แล้ว)
- pnpm 9  → เปิดใช้ผ่าน corepack: `corepack enable && corepack prepare pnpm@9.12.0 --activate`
- Docker (สำหรับ Postgres + MinIO)

## เริ่มต้น (Quick start)

```bash
# 1) ติดตั้ง dependencies ทั้ง workspace
pnpm install

# 2) ตั้งค่า env
cp .env.example .env
cp apps/admin/.env.local.example apps/admin/.env.local
cp apps/mobile/.env.example apps/mobile/.env

# 3) รัน Postgres + MinIO (สร้าง bucket ให้อัตโนมัติ)
pnpm infra:up

# 4) build shared packages (จำเป็นก่อน api รัน)
pnpm --filter @otc/shared build && pnpm --filter @otc/db build

# 5) สร้าง + รัน migration ให้ตรงกับ schema
pnpm db:generate    # สร้างไฟล์ SQL ใน packages/db/drizzle
pnpm db:migrate     # apply ลง Postgres

# 6) seed บัญชี admin เริ่มต้น (admin / admin1234)
pnpm db:seed

# 7) รัน dev ทั้งหมด (turbo จะรัน watch ของ shared/db + api + admin)
pnpm dev
```

- API: http://localhost:3001/api/health
- Admin: http://localhost:3000
- MinIO console: http://localhost:9001 (minioadmin / minioadmin)
- Mobile: `pnpm --filter @otc/mobile dev` แล้วเปิดด้วย Expo Go

## คำสั่งที่ใช้บ่อย

| คำสั่ง | ทำอะไร |
|---|---|
| `pnpm dev` | รัน dev ทุก app (watch) |
| `pnpm build` | build ทั้ง monorepo (turbo) |
| `pnpm test` | รัน test (รวม state-machine spec) |
| `pnpm db:studio` | เปิด Drizzle Studio ดูข้อมูล |
| `pnpm db:generate` | สร้าง migration จาก schema |
| `pnpm infra:down` | หยุด Postgres/MinIO |

## สถานะปัจจุบัน (เฟส 0–1 + แกน State Machine)

- [x] Monorepo + Docker + env
- [x] Drizzle schema ครบ 7 ตาราง (users, products, stores, inventory, transaction_docs, transaction_lines, stock_movements)
- [x] Auth (JWT + RBAC) + seed admin
- [x] **Inventory State Machine**: submit / approve / reject / cancel(+rollback) พร้อม row lock (`FOR UPDATE`)
- [x] Unit test ของ state-machine (5 transitions + rollback)
- [ ] Master Data CRUD (users/products/stores) + import xlsx  ← ถัดไป
- [ ] File upload (presigned S3) + PDF (Bplus)
- [ ] Admin Web UI (login, approvals, dashboard)
- [ ] Mobile UI (login, สต็อก, ทำรายการ + ถ่ายสลิป)

ดู roadmap เต็มใน [ARCHITECTURE.md](ARCHITECTURE.md) §9
