import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, ne, asc } from 'drizzle-orm';
import { products, type Database } from '@otc/db';
import type { UpsertProductInput, RecordStatus } from '@otc/shared';
import { DATABASE } from '../db/db.module.js';
import { nextCode } from '../common/code-generator.js';

@Injectable()
export class ProductsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  list() {
    return this.db.select().from(products).orderBy(asc(products.code));
  }

  async upsert(input: UpsertProductInput) {
    return this.db.transaction(async (tx) => {
      // กัน SKU ซ้ำ
      const dupWhere = input.id
        ? and(eq(products.sku, input.sku), ne(products.id, input.id))
        : eq(products.sku, input.sku);
      const dup = await tx.select({ id: products.id }).from(products).where(dupWhere).limit(1);
      if (dup.length) throw new ConflictException(`SKU "${input.sku}" ถูกใช้แล้ว`);

      const values = {
        sku: input.sku,
        name: input.name,
        price: input.price.toFixed(2),
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        status: input.status,
      };

      if (input.id) {
        const [updated] = await tx
          .update(products)
          .set({ ...values, updatedAt: new Date() })
          .where(eq(products.id, input.id))
          .returning();
        if (!updated) throw new NotFoundException('ไม่พบสินค้า');
        return updated;
      }

      const code = await nextCode(tx, products, products.code, 'PRD');
      const [created] = await tx
        .insert(products)
        .values({ code, ...values })
        .returning();
      return created!;
    });
  }

  async setStatus(id: string, status: RecordStatus) {
    const [updated] = await this.db
      .update(products)
      .set({ status, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning({ id: products.id, status: products.status });
    if (!updated) throw new NotFoundException('ไม่พบสินค้า');
    return updated;
  }
}
