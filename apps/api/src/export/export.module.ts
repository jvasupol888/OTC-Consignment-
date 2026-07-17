import { Module } from '@nestjs/common';
import { ExportService } from './export.service.js';
import { ExportController } from './export.controller.js';
import { TransactionsModule } from '../transactions/transactions.module.js';

@Module({
  imports: [TransactionsModule],
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
