import { Injectable, Inject, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, desc, aliasedTable, like } from 'drizzle-orm';
import { products, users, auditLogs, type Database } from '@otc/db';
import type { UpsertProductInput } from '@otc/shared';
import { DATABASE } from '../db/db.module.js';

@Injectable()
export class ProductsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findAll() {
    const editors = aliasedTable(users, 'editors');
    return this.db
      .select({
        id: products.id,
        code: products.code,
        sku: products.sku,
        name: products.name,
        price: products.price,
        startDate: products.startDate,
        endDate: products.endDate,
        status: products.status,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        updatedByFullName: editors.fullName,
      })
      .from(products)
      .leftJoin(editors, eq(products.updatedBy, editors.id))
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

  
  async bulkImport(items: UpsertProductInput[], editorId: string) {
    if (!items || items.length === 0) throw new BadRequestException('No data to import');
    
    // Check for duplicate SKUs in input
    const skus = items.map(i => i.sku);
    const uniqueSkus = new Set(skus);
    if (uniqueSkus.size !== skus.length) {
      throw new BadRequestException('พบ SKU ซ้ำกันในไฟล์ที่นำเข้า');
    }
    
    // Check against DB
    const existing = await this.db.select({ sku: products.sku }).from(products);
    const existingSkus = new Set(existing.map(e => e.sku));
    const duplicates = skus.filter(s => existingSkus.has(s));
    
    if (duplicates.length > 0) {
      throw new BadRequestException(`พบ SKU ซ้ำในระบบ: ${duplicates.join(', ')}`);
    }
    
    return await this.db.transaction(async (tx) => {
      let createdCount = 0;
      for (const item of items) {
        let nextCode = (item as any).code;
        if (!nextCode) {
           // Basic sequential code logic
           const latest = await tx
             .select({ code: products.code })
             .from(products)
             .where(like(products.code, 'PRD%'))
             .orderBy(desc(products.code))
             .limit(1);
           const num = latest[0] ? parseInt(latest[0].code.replace(/^\D+/g, ''), 10) : 0;
           nextCode = `PRD${String(num + 1 + createdCount).padStart(3, '0')}`;
        }
        
        const newRows = await tx.insert(products).values({
          code: nextCode,
          sku: item.sku,
          name: item.name,
          price: item.price?.toString() || '0',
          startDate: item.startDate,
          endDate: item.endDate,
          status: 'ACTIVE',
          updatedBy: editorId,
        }).returning();
        
        await tx.insert(auditLogs).values({
          tableName: 'products',
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

  async create(input: UpsertProductInput, userId: string) {
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

    return await this.db.transaction(async (tx) => {
      const newRows = await tx
        .insert(products)
        .values({
          code: nextCode,
          sku: input.sku,
          name: input.name,
          price: String(input.price), // Drizzle numeric
          startDate: input.startDate ?? null,
          endDate: input.endDate ?? null,
          status: input.status ?? 'ACTIVE',
          updatedBy: userId,
        })
        .returning();
      
      const newProduct = newRows[0];

      await tx.insert(auditLogs).values({
        tableName: 'products',
        recordId: newProduct.id,
        action: 'CREATE',
        newData: newProduct,
        userId,
      });

      return newProduct;
    });
  }

  async update(id: string, input: UpsertProductInput, userId: string) {
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

    return await this.db.transaction(async (tx) => {
      const updatedRows = await tx
        .update(products)
        .set({
          sku: input.sku ?? product.sku,
          name: input.name ?? product.name,
          price: input.price !== undefined ? String(input.price) : product.price,
          startDate: input.startDate ?? product.startDate,
          endDate: input.endDate ?? product.endDate,
          status: input.status ?? product.status,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(products.id, id))
        .returning();
      
      const updatedProduct = updatedRows[0];

      await tx.insert(auditLogs).values({
        tableName: 'products',
        recordId: updatedProduct.id,
        action: 'UPDATE',
        oldData: product,
        newData: updatedProduct,
        userId,
      });

      return updatedProduct;
    });
  }

  async remove(id: string, userId: string) {
    const product = await this.findOne(id);
    return await this.db.transaction(async (tx) => {
      const updatedRows = await tx
        .update(products)
        .set({
          status: 'INACTIVE',
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(products.id, id))
        .returning();
      
      const updatedProduct = updatedRows[0];

      await tx.insert(auditLogs).values({
        tableName: 'products',
        recordId: updatedProduct.id,
        action: 'DELETE', // หรือ INACTIVE
        oldData: product,
        newData: updatedProduct,
        userId,
      });

      return updatedProduct;
    });
  }
}
