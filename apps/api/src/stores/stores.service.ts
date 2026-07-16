import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, asc } from 'drizzle-orm';
import { stores, users, type Database } from '@otc/db';
import type { UpsertStoreInput } from '@otc/shared';
import { DATABASE } from '../db/db.module.js';
import { nextCode } from '../common/code-generator.js';

@Injectable()
export class StoresService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** list — join ชื่อเซลล์ที่ดูแล; ถ้าส่ง assignedUserId มา = กรองเฉพาะร้านของเซลล์นั้น (row-level) */
  async list(assignedUserId?: string) {
    const q = this.db
      .select({
        id: stores.id,
        code: stores.code,
        name: stores.name,
        location: stores.location,
        assignedUserId: stores.assignedUserId,
        assignedUserName: users.fullName,
      })
      .from(stores)
      .leftJoin(users, eq(stores.assignedUserId, users.id))
      .orderBy(asc(stores.code));

    if (assignedUserId) {
      return q.where(eq(stores.assignedUserId, assignedUserId));
    }
    return q;
  }

  async upsert(input: UpsertStoreInput) {
    return this.db.transaction(async (tx) => {
      const values = {
        name: input.name,
        location: input.location ?? null,
        assignedUserId: input.assignedUserId ?? null,
      };

      if (input.id) {
        const [updated] = await tx
          .update(stores)
          .set({ ...values, updatedAt: new Date() })
          .where(eq(stores.id, input.id))
          .returning();
        if (!updated) throw new NotFoundException('ไม่พบร้านค้า');
        return updated;
      }

      const code = await nextCode(tx, stores, stores.code, 'STR');
      const [created] = await tx
        .insert(stores)
        .values({ code, ...values })
        .returning();
      return created!;
    });
  }

  /** โอนร้านให้เซลล์คนใหม่ — สิทธิ์การเห็นย้ายทันที (สต็อก pharmacy ผูกกับร้าน ไม่ต้องย้าย) */
  async transfer(storeId: string, newUserId: string) {
    const [updated] = await this.db
      .update(stores)
      .set({ assignedUserId: newUserId, updatedAt: new Date() })
      .where(eq(stores.id, storeId))
      .returning({ id: stores.id, assignedUserId: stores.assignedUserId });
    if (!updated) throw new NotFoundException('ไม่พบร้านค้า');
    return updated;
  }
}
