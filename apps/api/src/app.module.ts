import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './db/db.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { ProductsModule } from './products/products.module.js';
import { StoresModule } from './stores/stores.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { FilesModule } from './files/files.module.js';
import { TransactionsModule } from './transactions/transactions.module.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    StoresModule,
    InventoryModule,
    FilesModule,
    TransactionsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
