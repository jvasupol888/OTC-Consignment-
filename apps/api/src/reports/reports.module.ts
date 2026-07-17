import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { ReportsController } from './reports.controller.js';
import { ExcelService } from './excel.service.js';
import { PdfService } from './pdf.service.js';
import { ProductsModule } from '../products/products.module.js';
import { StoresModule } from '../stores/stores.module.js';
import { TransactionsModule } from '../transactions/transactions.module.js';

@Module({
  imports: [ProductsModule, StoresModule, TransactionsModule],
  providers: [ReportsService, ExcelService, PdfService],
  controllers: [ReportsController],
})
export class ReportsModule {}
