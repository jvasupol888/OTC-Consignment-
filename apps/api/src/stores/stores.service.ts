import { Injectable, Inject, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, desc, aliasedTable, like } from 'drizzle-orm';
import { stores, users, auditLogs, type Database } from '@otc/db';
import type { UpsertStoreInput, TransferStoreInput } from '@otc/shared';
import { DATABASE } from '../db/db.module.js';

@Injectable()
export class StoresService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findAll() {
    const editors = aliasedTable(users, 'editors');
    return this.db
      .select({
        id: stores.id,
        code: stores.code,
        name: stores.name,
        location: stores.location,
        province: stores.province,
        storageLocation: stores.storageLocation,
        phone: stores.phone,
        assignedUserId: stores.assignedUserId,
        assignedUserFullName: users.fullName,
        status: stores.status,
        createdAt: stores.createdAt,
        updatedAt: stores.updatedAt,
        updatedByFullName: editors.fullName,
      })
      .from(stores)
      .leftJoin(users, eq(stores.assignedUserId, users.id))
      .leftJoin(editors, eq(stores.updatedBy, editors.id))
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

  
  async bulkImport(items: UpsertStoreInput[], editorId: string) {
    if (!items || items.length === 0) throw new BadRequestException('No data to import');
    
    // Check for duplicate names in input
    const names = items.map(i => i.name);
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) {
      throw new BadRequestException('พบชื่อร้านค้าซ้ำกันในไฟล์ที่นำเข้า');
    }
    
    // Check against DB
    const existing = await this.db.select({ name: stores.name }).from(stores);
    const existingNames = new Set(existing.map(e => e.name));
    const duplicates = names.filter(s => existingNames.has(s));
    
    if (duplicates.length > 0) {
      throw new BadRequestException(`พบชื่อร้านค้าซ้ำในระบบ: ${duplicates.join(', ')}`);
    }
    
    return await this.db.transaction(async (tx) => {
      let createdCount = 0;
      
      const latest = await tx
        .select({ code: stores.code })
        .from(stores)
        .where(like(stores.code, 'STR%'))
        .orderBy(desc(stores.code))
        .limit(1);
      let num = latest[0] ? parseInt(latest[0].code.replace(/^\D+/g, ''), 10) : 0;

      for (const item of items) {
        let nextCode = (item as any).code;
        if (!nextCode) {
           num++;
           nextCode = `STR${String(num).padStart(3, '0')}`;
        }
        
        const newRows = await tx.insert(stores).values({
          code: nextCode,
          name: item.name,
          location: item.location,
          province: item.province,
          storageLocation: item.storageLocation,
          phone: item.phone,
          assignedUserId: item.assignedUserId || null,
          status: 'ACTIVE',
          updatedBy: editorId,
        }).returning();
        
        await tx.insert(auditLogs).values({
          tableName: 'stores',
          recordId: newRows[0].id,
          action: 'CREATE_BULK',
          newData: newRows[0],
          userId: editorId,
        });
        createdCount++;
      }
      return { success: true, count: createdCount };
    });
  }

  async create(input: UpsertStoreInput, userId: string) {
    // เจน Code แบบรันลำดับ (เช่น STR001)
    const latest = await this.db
      .select({ code: stores.code })
      .from(stores)
      .orderBy(desc(stores.code))
      .limit(1);

    const num = latest[0] ? parseInt(latest[0].code.replace(/^\D+/g, ''), 10) : 0;
    const nextCode = `STR${String(num + 1).padStart(3, '0')}`;

    return await this.db.transaction(async (tx) => {
      const newRows = await tx
        .insert(stores)
        .values({
          code: nextCode,
          name: input.name,
          location: input.location ?? null,
          province: input.province ?? null,
          storageLocation: input.storageLocation ?? null,
          phone: input.phone ?? null,
          assignedUserId: input.assignedUserId ?? null,
          status: input.status ?? 'ACTIVE',
          updatedBy: userId,
        })
        .returning();
      
      const newStore = newRows[0];

      await tx.insert(auditLogs).values({
        tableName: 'stores',
        recordId: newStore.id,
        action: 'CREATE',
        newData: newStore,
        userId,
      });

      return newStore;
    });
  }

  async update(id: string, input: UpsertStoreInput, userId: string) {
    const store = await this.findOne(id);

    return await this.db.transaction(async (tx) => {
      const updatedRows = await tx
        .update(stores)
        .set({
          name: input.name ?? store.name,
          location: input.location !== undefined ? input.location : store.location,
          province: input.province !== undefined ? input.province : store.province,
          storageLocation: input.storageLocation !== undefined ? input.storageLocation : store.storageLocation,
          phone: input.phone !== undefined ? input.phone : store.phone,
          assignedUserId: input.assignedUserId !== undefined ? input.assignedUserId : store.assignedUserId,
          status: input.status ?? store.status,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(stores.id, id))
        .returning();
      
      const updatedStore = updatedRows[0];

      await tx.insert(auditLogs).values({
        tableName: 'stores',
        recordId: updatedStore.id,
        action: 'UPDATE',
        oldData: store,
        newData: updatedStore,
        userId,
      });

      return updatedStore;
    });
  }

  async transfer(input: TransferStoreInput, userId: string) {
    const store = await this.findOne(input.storeId);
    
    // ตรวจสอบว่ามีผู้ใช้ใหม่จริง
    const userRows = await this.db.select().from(users).where(eq(users.id, input.newUserId));
    if (!userRows[0]) throw new NotFoundException('ไม่พบผู้ใช้ที่ต้องการโอนย้ายร้านค้าให้');

    return await this.db.transaction(async (tx) => {
      const updatedRows = await tx
        .update(stores)
        .set({
          assignedUserId: input.newUserId,
          updatedAt: new Date(),
        })
        .where(eq(stores.id, input.storeId))
        .returning();
      
      const updatedStore = updatedRows[0];

      await tx.insert(auditLogs).values({
        tableName: 'stores',
        recordId: updatedStore.id,
        action: 'TRANSFER',
        oldData: store,
        newData: updatedStore,
        userId,
      });

      return updatedStore;
    });
  }

  async remove(id: string, userId: string) {
    const store = await this.findOne(id);
    return await this.db.transaction(async (tx) => {
      const deleted = await tx
        .delete(stores)
        .where(eq(stores.id, id))
        .returning();
      
      const deletedStore = deleted[0];

      await tx.insert(auditLogs).values({
        tableName: 'stores',
        recordId: deletedStore.id,
        action: 'DELETE',
        oldData: store,
        userId,
      });

      return deletedStore;
    });
  }
}
