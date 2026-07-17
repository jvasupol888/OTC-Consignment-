import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './db/db.module.js';
import { AuthModule } from './auth/auth.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { TransactionsModule } from './transactions/transactions.module.js';
import { ProductsModule } from './products/products.module.js';
import { StoresModule } from './stores/stores.module.js';
import { UsersModule } from './users/users.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { UploadModule } from './upload/upload.module.js';
import { ExportModule } from './export/export.module.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    DbModule,
    AuthModule,
    InventoryModule,
    TransactionsModule,
    ProductsModule,
    StoresModule,
    UsersModule,
    DashboardModule,
    UploadModule,
    ExportModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

