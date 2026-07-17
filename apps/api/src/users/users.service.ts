import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { eq, desc, not } from 'drizzle-orm';
import * as argon2 from 'argon2';
import { users, type Database } from '@otc/db';
import type { UpsertUserInput } from '@otc/shared';
import { DATABASE } from '../db/db.module.js';

@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findAll() {
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
      })
      .from(users)
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

  async create(input: UpsertUserInput) {
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

    // เจน Code แบบรันลำดับ (เช่น USR001)
    const latest = await this.db
      .select({ code: users.code })
      .from(users)
      .orderBy(desc(users.code))
      .limit(1);

    const num = latest[0] ? parseInt(latest[0].code.replace(/^\D+/g, ''), 10) : 0;
    const nextCode = `USR${String(num + 1).padStart(3, '0')}`;

    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });

    const newRows = await this.db
      .insert(users)
      .values({
        code: nextCode,
        username: input.username,
        passwordHash,
        fullName: input.fullName,
        role: input.role,
        status: input.status ?? 'ACTIVE',
      })
      .returning({
        id: users.id,
        code: users.code,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
        status: users.status,
      });

    return newRows[0];
  }

  async update(id: string, input: UpsertUserInput) {
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

    const updatedRows = await this.db
      .update(users)
      .set({
        username: input.username ?? user.username,
        passwordHash: passwordHash ?? undefined,
        fullName: input.fullName ?? user.fullName,
        role: input.role ?? user.role,
        status: input.status ?? user.status,
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

    return updatedRows[0];
  }

  async remove(id: string) {
    await this.findOne(id);
    const updatedRows = await this.db
      .update(users)
      .set({
        status: 'INACTIVE',
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
    return updatedRows[0];
  }
}
