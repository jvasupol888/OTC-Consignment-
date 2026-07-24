import { Injectable, Inject, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, desc, not, like, aliasedTable } from 'drizzle-orm';
import * as argon2 from 'argon2';
import { users, auditLogs, type Database } from '@otc/db';
import type { UpsertUserInput } from '@otc/shared';
import { DATABASE } from '../db/db.module.js';

@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findAll() {
    const editors = aliasedTable(users, 'editors');
    return this.db
      .select({
        id: users.id,
        code: users.code,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        updatedByFullName: editors.fullName,
      })
      .from(users)
      .leftJoin(editors, eq(users.updatedBy, editors.id))
      .orderBy(users.code);
  }

  async findOne(id: string) {
    const rows = await this.db
      .select({
        id: users.id,
        code: users.code,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id));
    if (!rows[0]) throw new NotFoundException('ไม่พบผู้ใช้งานที่ระบุ');
    return rows[0];
  }

  
  async bulkImport(items: UpsertUserInput[], editorId: string) {
    if (!items || items.length === 0) throw new BadRequestException('No data to import');
    
    // Check for duplicate usernames in input
    const usernames = items.map(i => i.username);
    const uniqueUsernames = new Set(usernames);
    if (uniqueUsernames.size !== usernames.length) {
      throw new BadRequestException('พบ Username ซ้ำกันในไฟล์ที่นำเข้า');
    }
    
    // Check against DB
    const existing = await this.db.select({ username: users.username }).from(users);
    const existingUsernames = new Set(existing.map(e => e.username));
    const duplicates = usernames.filter(s => existingUsernames.has(s));
    
    if (duplicates.length > 0) {
      throw new BadRequestException(`พบ Username ซ้ำในระบบ: ${duplicates.join(', ')}`);
    }
    
    return await this.db.transaction(async (tx) => {
      let createdCount = 0;
      for (const item of items) {
        if (!item.password) {
          throw new BadRequestException(`ผู้ใช้งาน ${item.username} ไม่มีรหัสผ่าน`);
        }
        let nextCode = item.code;
        if (!nextCode) {
           const latest = await tx
             .select({ code: users.code })
             .from(users)
             .where(like(users.code, 'USR%'))
             .orderBy(desc(users.code))
             .limit(1);
           const num = latest[0] ? parseInt(latest[0].code.replace(/^\D+/g, ''), 10) : 0;
           nextCode = `USR${String(num + 1 + createdCount).padStart(3, '0')}`;
        }
        
        const passwordHash = await argon2.hash(item.password, { type: argon2.argon2id });
        
        const newRows = await tx.insert(users).values({
          code: nextCode,
          username: item.username,
          passwordHash,
          fullName: item.fullName,
          role: item.role,
          status: 'ACTIVE',
          updatedBy: editorId,
        }).returning();
        
        await tx.insert(auditLogs).values({
          tableName: 'users',
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

  async create(input: UpsertUserInput, editorId: string) {
    // ตรวจสอบ username ซ้ำ
    const existing = await this.db
      .select()
      .from(users)
      .where(eq(users.username, input.username));
    if (existing[0]) {
      throw new ConflictException(`ชื่อผู้ใช้งาน "${input.username}" มีในระบบแล้ว`);
    }

    if (!input.password) {
      throw new ConflictException('ต้องระบุรหัสผ่านสำหรับการสร้างบัญชีใหม่');
    }

    let nextCode = input.code;
    if (!nextCode) {
      // เจน Code แบบรันลำดับ (เช่น USR001)
      const latest = await this.db
        .select({ code: users.code })
        .from(users)
        .where(like(users.code, 'USR%'))
        .orderBy(desc(users.code))
        .limit(1);

      const num = latest[0] ? parseInt(latest[0].code.replace(/^\D+/g, ''), 10) : 0;
      nextCode = `USR${String(num + 1).padStart(3, '0')}`;
    }

    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });

    return await this.db.transaction(async (tx) => {
      const newRows = await tx
        .insert(users)
        .values({
          code: nextCode,
          username: input.username,
          passwordHash,
          fullName: input.fullName,
          role: input.role,
          status: input.status ?? 'ACTIVE',
          updatedBy: editorId,
        })
        .returning({
          id: users.id,
          code: users.code,
          username: users.username,
          fullName: users.fullName,
          role: users.role,
          status: users.status,
        });

      const newUser = newRows[0];

      await tx.insert(auditLogs).values({
        tableName: 'users',
        recordId: newUser.id,
        action: 'CREATE',
        newData: newUser,
        userId: editorId,
      });

      return newUser;
    });
  }

  async update(id: string, input: UpsertUserInput, editorId: string) {
    const user = await this.findOne(id);

    // ตรวจสอบ username ซ้ำถ้าเปลี่ยน username
    if (input.username && input.username !== user.username) {
      const existing = await this.db
        .select()
        .from(users)
        .where(eq(users.username, input.username));
      if (existing[0]) {
        throw new ConflictException(`ชื่อผู้ใช้งาน "${input.username}" มีในระบบแล้ว`);
      }
    }

    let passwordHash = undefined;
    if (input.password) {
      passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    }

    return await this.db.transaction(async (tx) => {
      const updatedRows = await tx
        .update(users)
        .set({
          code: input.code ?? user.code,
          username: input.username ?? user.username,
          passwordHash: passwordHash ?? undefined,
          fullName: input.fullName ?? user.fullName,
          role: input.role ?? user.role,
          status: input.status ?? user.status,
          updatedBy: editorId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning({
          id: users.id,
          code: users.code,
          username: users.username,
          fullName: users.fullName,
          role: users.role,
          status: users.status,
        });

      const updatedUser = updatedRows[0];

      await tx.insert(auditLogs).values({
        tableName: 'users',
        recordId: updatedUser.id,
        action: 'UPDATE',
        oldData: user,
        newData: updatedUser,
        userId: editorId,
      });

      return updatedUser;
    });
  }

  async remove(id: string, editorId: string) {
    const user = await this.findOne(id);
    return await this.db.transaction(async (tx) => {
      const updatedRows = await tx
        .update(users)
        .set({
          status: 'INACTIVE',
          updatedBy: editorId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning({
          id: users.id,
          code: users.code,
          username: users.username,
          fullName: users.fullName,
          role: users.role,
          status: users.status,
        });
      
      const updatedUser = updatedRows[0];

      await tx.insert(auditLogs).values({
        tableName: 'users',
        recordId: updatedUser.id,
        action: 'DELETE', // หรือ INACTIVE
        oldData: user,
        newData: updatedUser,
        userId: editorId,
      });

      return updatedUser;
    });
  }
}
