import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import {
  transactionDocs,
  transactionLines,
  products,
  users,
  stores,
  inventory,
  type Database,
} from '@otc/db';
import { DATABASE } from '../db/db.module.js';

@Injectable()
export class DashboardService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async getAdminStats(filters?: { startDate?: string; endDate?: string; saleUserId?: string }) {
    // Base conditions for ANY approved docs (for recentTxns)
    const baseConditions: any[] = [
      eq(transactionDocs.status, 'APPROVED')
    ];

    if (filters?.startDate) {
      baseConditions.push(sql`${transactionDocs.createdAt} >= ${new Date(filters.startDate).toISOString()}`);
    }
    if (filters?.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      baseConditions.push(sql`${transactionDocs.createdAt} <= ${end.toISOString()}`);
    }
    if (filters?.saleUserId && filters.saleUserId !== 'ยอดรวมทั้งหมด') {
      baseConditions.push(eq(transactionDocs.createdBy, filters.saleUserId));
    }

    const baseWhere = and(...baseConditions);
    
    // Conditions specifically for SALE (for stats)
    const salesConditions = [...baseConditions, eq(transactionDocs.docType, 'SALE')];
    const salesWhere = and(...salesConditions);

    // 1. จำนวนรายการรออนุมัติ (Global)
    const pendingCountResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(transactionDocs)
      .where(eq(transactionDocs.status, 'PENDING'));
    const pendingCount = pendingCountResult[0]?.count ?? 0;

    // 2. จำนวนเซลล์ที่แอคทีฟ (Global)
    const activeSalesResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.role, 'SALE'), eq(users.status, 'ACTIVE')));
    const activeSalesCount = activeSalesResult[0]?.count ?? 0;

    // 3. ยอดขายทั้งหมด และจำนวนที่ขายได้ (APPROVED + SALE + FILTERS)
    const totalSalesResult = await this.db
      .select({ 
        total: sql<number>`COALESCE(SUM(${transactionLines.quantity} * ${products.price}::numeric), 0)`,
        items: sql<number>`COALESCE(SUM(${transactionLines.quantity}), 0)`,
        count: sql<number>`COUNT(DISTINCT ${transactionDocs.id})`
      })
      .from(transactionDocs)
      .leftJoin(transactionLines, eq(transactionDocs.id, transactionLines.docId))
      .leftJoin(products, eq(transactionLines.productId, products.id))
      .where(salesWhere);
      
    const totalSalesValue = Number(totalSalesResult[0]?.total ?? 0);
    const totalSoldItems = Number(totalSalesResult[0]?.items ?? 0);
    const approvedSalesCount = Number(totalSalesResult[0]?.count ?? 0);

    // 4. สินค้ายอดนิยม (Top Product) in the filtered range
    const topProductResult = await this.db
      .select({
        name: products.name,
        qty: sql<number>`SUM(${transactionLines.quantity})`
      })
      .from(transactionDocs)
      .innerJoin(transactionLines, eq(transactionDocs.id, transactionLines.docId))
      .innerJoin(products, eq(transactionLines.productId, products.id))
      .where(salesWhere)
      .groupBy(products.name)
      .orderBy(desc(sql`SUM(${transactionLines.quantity})`))
      .limit(1);

    const topProduct = topProductResult[0]?.name ?? '-';

    // 5. จำนวนร้านค้าทั้งหมด (Global)
    const storesCountResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(stores);
    const totalStores = storesCountResult[0]?.count ?? 0;

    // 6. รายการล่าสุด 5 รายการ (Filtered Approved Sales)
    const recentTxns = await this.db
      .select({
        id: transactionDocs.id,
        docNo: transactionDocs.docNo,
        docType: transactionDocs.docType,
        status: transactionDocs.status,
        creatorName: users.fullName,
        storeName: stores.name,
        createdAt: transactionDocs.createdAt,
        totalValue: sql<number>`COALESCE(SUM(${transactionLines.quantity} * ${products.price}::numeric), 0)`,
      })
      .from(transactionDocs)
      .leftJoin(users, eq(transactionDocs.createdBy, users.id))
      .leftJoin(stores, eq(transactionDocs.storeId, stores.id))
      .leftJoin(transactionLines, eq(transactionDocs.id, transactionLines.docId))
      .leftJoin(products, eq(transactionLines.productId, products.id))
      .where(baseWhere)
      .groupBy(
        transactionDocs.id,
        transactionDocs.docNo,
        transactionDocs.docType,
        transactionDocs.status,
        users.fullName,
        stores.name,
        transactionDocs.createdAt
      )
      .orderBy(desc(transactionDocs.createdAt))
      .limit(5);

    // 7. กราฟยอดขายรายวัน
    const chartConditions = [...salesConditions];
    if (!filters?.startDate && !filters?.endDate) {
      chartConditions.push(sql`${transactionDocs.createdAt} >= NOW() - INTERVAL '7 days'`);
    }

    const chartData = await this.db
      .select({
        date: sql<string>`TO_CHAR(${transactionDocs.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
        value: sql<number>`COALESCE(SUM(${transactionLines.quantity} * ${products.price}::numeric), 0)`,
      })
      .from(transactionDocs)
      .leftJoin(transactionLines, eq(transactionDocs.id, transactionLines.docId))
      .leftJoin(products, eq(transactionLines.productId, products.id))
      .where(and(...chartConditions))
      .groupBy(sql`TO_CHAR(${transactionDocs.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`)
      .orderBy(sql`1`);

    return {
      pendingCount,
      activeSalesCount,
      totalSalesValue,
      totalSoldItems,
      approvedSalesCount,
      topProduct,
      totalStores,
      recentTxns,
      chartData: chartData.map((d) => ({
        date: d.date,
        value: Number(d.value),
      })),
    };
  }

  async getMobileStats(userId: string) {
    // 1. ค้นหาสต็อกคงเหลือของเซลล์เอง (SALE)
    const saleInventory = await this.db
      .select({
        quantity: inventory.quantity,
        price: products.price,
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .where(
        and(
          eq(inventory.locationType, 'SALE'),
          eq(inventory.saleUserId, userId)
        )
      );

    const saleStockCount = saleInventory.reduce((acc, row) => acc + (row.quantity ?? 0), 0);
    const saleStockValue = saleInventory.reduce(
      (acc, row) => acc + (row.quantity ?? 0) * Number(row.price ?? 0),
      0
    );

    // 2. ค้นหาร้านค้าที่รับผิดชอบ
    const assignedStores = await this.db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.assignedUserId, userId));

    const storeIds = assignedStores.map((s) => s.id);

    // 3. ค้นหาสต็อกฝากขายร้านยา (PHARMACY)
    let pharmStockCount = 0;
    let pharmStockValue = 0;

    if (storeIds.length > 0) {
      const pharmInventory = await this.db
        .select({
          quantity: inventory.quantity,
          price: products.price,
        })
        .from(inventory)
        .leftJoin(products, eq(inventory.productId, products.id))
        .where(
          and(
            eq(inventory.locationType, 'PHARMACY'),
            inArray(inventory.storeId, storeIds)
          )
        );

      pharmStockCount = pharmInventory.reduce((acc, row) => acc + (row.quantity ?? 0), 0);
      pharmStockValue = pharmInventory.reduce(
        (acc, row) => acc + (row.quantity ?? 0) * Number(row.price ?? 0),
        0
      );
    }

    return {
      saleStockCount,
      saleStockValue,
      pharmStockCount,
      pharmStockValue,
    };
  }
}

