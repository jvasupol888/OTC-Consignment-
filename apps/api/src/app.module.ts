import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './db/db.module.js';
import { AuthModule } from './auth/auth.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { TransactionsModule } from './transactions/transactions.module.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    AuthModule,
    InventoryModule,
    TransactionsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
