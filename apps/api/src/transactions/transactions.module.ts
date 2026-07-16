import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service.js';
import { TransactionsController } from './transactions.controller.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { FilesModule } from '../files/files.module.js';

@Module({
  imports: [InventoryModule, FilesModule],
  providers: [TransactionsService],
  controllers: [TransactionsController],
  exports: [TransactionsService],
})
export class TransactionsModule {}
