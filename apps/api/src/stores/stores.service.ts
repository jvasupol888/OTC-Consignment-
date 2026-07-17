import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { stores, users, type Database } from '@otc/db';
import type { UpsertStoreInput, TransferStoreInput } from '@otc/shared';
import { DATABASE } from '../db/db.module.js';

@Injectable()
export class StoresService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findAll() {
    return this.db
      .select({
        id: stores.id,
        code: stores.code,
        name: stores.name,
        location: stores.location,
        assignedUserId: stores.assignedUserId,
        assignedUserFullName: users.fullName,
        createdAt: stores.createdAt,
        updatedAt: stores.updatedAt,
      })
      .from(stores)
      .leftJoin(users, eq(stores.assignedUserId, users.id))
      .orderBy(stores.code);
  }

  async findOne(id: string) {
    const rows = await this.db
      .select()
      .from(stores)
      .where(eq(stores.id, id));
    if (!rows[0]) throw new NotFoundException('ไม่พบร้านค้าที่ระบุ');
    return rows[0];
  }

  async create(input: UpsertStoreInput) {
    // เจน Code แบบรันลำดับ (เช่น STR001)
    const latest = await this.db
      .select({ code: stores.code })
      .from(stores)
      .orderBy(desc(stores.code))
      .limit(1);

    const num = latest[0] ? parseInt(latest[0].code.replace(/^\D+/g, ''), 10) : 0;
    const nextCode = `STR${String(num + 1).padStart(3, '0')}`;

    const newRows = await this.db
      .insert(stores)
      .values({
        code: nextCode,
        name: input.name,
        location: input.location ?? null,
        assignedUserId: input.assignedUserId ?? null,
      })
      .returning();

    return newRows[0];
  }

  async update(id: string, input: UpsertStoreInput) {
    const store = await this.findOne(id);

    const updatedRows = await this.db
      .update(stores)
      .set({
        name: input.name ?? store.name,
        location: input.location !== undefined ? input.location : store.location,
        assignedUserId: input.assignedUserId !== undefined ? input.assignedUserId : store.assignedUserId,
        updatedAt: new Date(),
      })
      .where(eq(stores.id, id))
      .returning();

    return updatedRows[0];
  }

  async transfer(input: TransferStoreInput) {
    await this.findOne(input.storeId);
    
    // ตรวจสอบว่ามีผู้ใช้ใหม่จริง
    const userRows = await this.db.select().from(users).where(eq(users.id, input.newUserId));
    if (!userRows[0]) throw new NotFoundException('ไม่พบผู้ใช้ที่ต้องการโอนย้ายร้านค้าให้');

    const updatedRows = await this.db
      .update(stores)
      .set({
        assignedUserId: input.newUserId,
        updatedAt: new Date(),
      })
      .where(eq(stores.id, input.storeId))
      .returning();

    return updatedRows[0];
  }

  async remove(id: string) {
    await this.findOne(id);
    const deleted = await this.db
      .delete(stores)
      .where(eq(stores.id, id))
      .returning();
    return deleted[0];
  }
}
