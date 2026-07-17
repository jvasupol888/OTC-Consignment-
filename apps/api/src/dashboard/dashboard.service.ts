import { Injectable, Inject } from '@nestjs/common';
import { sql, eq, and } from 'drizzle-orm';
import { transactionDocs, inventory, users, products, stores, type Database } from '@otc/db';
import { DATABASE } from '../db/db.module.js';

@Injectable()
export class DashboardService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async stats(expiringWithinDays = 14) {
    const [pending] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(transactionDocs)
      .where(eq(transactionDocs.status, 'PENDING'));

    const stockRows = await this.db
      .select({
        locationType: inventory.locationType,
        total: sql<number>`COALESCE(SUM(${inventory.quantity}), 0)::int`,
      })
      .from(inventory)
      .groupBy(inventory.locationType);
    const saleStock = stockRows.find((r) => r.locationType === 'SALE')?.total ?? 0;
    const pharmacyStock = stockRows.find((r) => r.locationType === 'PHARMACY')?.total ?? 0;

    const [saleCount] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(users)
      .where(and(eq(users.role, 'SALE'), eq(users.status, 'ACTIVE')));

    const [productCount] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(products);

    const [storeCount] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(stores);

    // สินค้าใกล้หมดอายุ/สิ้นสุดการขาย ภายใน N วัน (รวมที่เลยแล้ว) เฉพาะ Active
    const [expiring] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(products)
      .where(
        and(
          eq(products.status, 'ACTIVE'),
          sql`${products.endDate} IS NOT NULL`,
          sql`${products.endDate} <= CURRENT_DATE + ${expiringWithinDays} * INTERVAL '1 day'`,
        ),
      );

    return {
      pendingApprovals: pending?.n ?? 0,
      totalSaleStock: saleStock,
      totalPharmacyStock: pharmacyStock,
      totalStock: saleStock + pharmacyStock,
      totalSales: saleCount?.n ?? 0,
      totalProducts: productCount?.n ?? 0,
      totalStores: storeCount?.n ?? 0,
      expiringSoon: expiring?.n ?? 0,
    };
  }
}
