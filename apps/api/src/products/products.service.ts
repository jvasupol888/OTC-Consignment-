import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { products, type Database } from '@otc/db';
import type { UpsertProductInput } from '@otc/shared';
import { DATABASE } from '../db/db.module.js';

@Injectable()
export class ProductsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findAll() {
    return this.db
      .select()
      .from(products)
      .orderBy(products.code);
  }

  async findOne(id: string) {
    const rows = await this.db
      .select()
      .from(products)
      .where(eq(products.id, id));
    if (!rows[0]) throw new NotFoundException('ไม่พบสินค้าที่ระบุ');
    return rows[0];
  }

  async create(input: UpsertProductInput) {
    // ตรวจสอบ SKU ซ้ำ
    const existing = await this.db
      .select()
      .from(products)
      .where(eq(products.sku, input.sku));
    if (existing[0]) {
      throw new ConflictException(`รหัส SKU "${input.sku}" มีในระบบแล้ว`);
    }

    // เจน Code แบบรันลำดับ (เช่น PRD001)
    const latest = await this.db
      .select({ code: products.code })
      .from(products)
      .orderBy(desc(products.code))
      .limit(1);

    const num = latest[0] ? parseInt(latest[0].code.replace(/^\D+/g, ''), 10) : 0;
    const nextCode = `PRD${String(num + 1).padStart(3, '0')}`;

    const newRows = await this.db
      .insert(products)
      .values({
        code: nextCode,
        sku: input.sku,
        name: input.name,
        price: String(input.price), // Drizzle numeric
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        status: input.status ?? 'ACTIVE',
      })
      .returning();

    return newRows[0];
  }

  async update(id: string, input: UpsertProductInput) {
    const product = await this.findOne(id);

    // ตรวจสอบ SKU ซ้ำถ้าเปลี่ยน SKU
    if (input.sku && input.sku !== product.sku) {
      const existing = await this.db
        .select()
        .from(products)
        .where(eq(products.sku, input.sku));
      if (existing[0]) {
        throw new ConflictException(`รหัส SKU "${input.sku}" มีในระบบแล้ว`);
      }
    }

    const updatedRows = await this.db
      .update(products)
      .set({
        sku: input.sku ?? product.sku,
        name: input.name ?? product.name,
        price: input.price !== undefined ? String(input.price) : product.price,
        startDate: input.startDate ?? product.startDate,
        endDate: input.endDate ?? product.endDate,
        status: input.status ?? product.status,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    return updatedRows[0];
  }

  async remove(id: string) {
    await this.findOne(id);
    const updatedRows = await this.db
      .update(products)
      .set({
        status: 'INACTIVE',
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();
    return updatedRows[0];
  }
}
