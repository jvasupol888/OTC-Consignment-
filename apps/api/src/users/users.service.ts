import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { and, eq, ne, asc } from 'drizzle-orm';
import { users, type Database } from '@otc/db';
import type { UpsertUserInput, RecordStatus } from '@otc/shared';
import { DATABASE } from '../db/db.module.js';
import { nextCode } from '../common/code-generator.js';

@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** list — ไม่คืน passwordHash */
  async list() {
    return this.db
      .select({
        id: users.id,
        code: users.code,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(asc(users.code));
  }

  async upsert(input: UpsertUserInput) {
    return this.db.transaction(async (tx) => {
      // กัน username ซ้ำ
      const dupWhere = input.id
        ? and(eq(users.username, input.username), ne(users.id, input.id))
        : eq(users.username, input.username);
      const dup = await tx.select({ id: users.id }).from(users).where(dupWhere).limit(1);
      if (dup.length) throw new ConflictException(`Username "${input.username}" ถูกใช้แล้ว`);

      // ----- UPDATE -----
      if (input.id) {
        const set: Record<string, unknown> = {
          username: input.username,
          fullName: input.fullName,
          role: input.role,
          status: input.status,
          updatedAt: new Date(),
        };
        if (input.password) {
          set.passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
        }
        const [updated] = await tx
          .update(users)
          .set(set)
          .where(eq(users.id, input.id))
          .returning({ id: users.id, code: users.code, username: users.username });
        if (!updated) throw new NotFoundException('ไม่พบผู้ใช้งาน');
        return updated;
      }

      // ----- CREATE -----
      if (!input.password)
        throw new BadRequestException('ต้องระบุรหัสผ่านสำหรับผู้ใช้ใหม่');
      const code = await nextCode(tx, users, users.code, 'USR');
      const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
      const [created] = await tx
        .insert(users)
        .values({
          code,
          username: input.username,
          passwordHash,
          fullName: input.fullName,
          role: input.role,
          status: input.status,
        })
        .returning({ id: users.id, code: users.code, username: users.username });
      return created!;
    });
  }

  async setStatus(id: string, status: RecordStatus) {
    const [updated] = await this.db
      .update(users)
      .set({ status, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({ id: users.id, status: users.status });
    if (!updated) throw new NotFoundException('ไม่พบผู้ใช้งาน');
    return updated;
  }
}
