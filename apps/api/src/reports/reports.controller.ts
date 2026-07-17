import {
  Controller,
  Get,
  Post,
  Param,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ReportsService } from './reports.service.js';
import { ExcelService } from './excel.service.js';
import { PdfService } from './pdf.service.js';
import { JwtAuthGuard, RolesGuard } from '../auth/guards.js';
import { Roles } from '../auth/decorators.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SYSTEM_ADMIN')
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly excel: ExcelService,
    private readonly pdf: PdfService,
  ) {}

  // ---------- Export xlsx ----------
  @Get('products.xlsx')
  async exportProducts(@Res() res: Response) {
    const buf = await this.excel.build(
      'Products',
      [
        { header: 'code', key: 'code' },
        { header: 'sku', key: 'sku' },
        { header: 'name', key: 'name', width: 30 },
        { header: 'price', key: 'price' },
        { header: 'startDate', key: 'startDate' },
        { header: 'endDate', key: 'endDate' },
        { header: 'status', key: 'status' },
      ],
      await this.reports.productRows(),
    );
    this.sendXlsx(res, 'products.xlsx', buf);
  }

  @Get('stores.xlsx')
  async exportStores(@Res() res: Response) {
    const buf = await this.excel.build(
      'Stores',
      [
        { header: 'code', key: 'code' },
        { header: 'name', key: 'name', width: 30 },
        { header: 'location', key: 'location', width: 30 },
        { header: 'assignedUsername', key: 'assignedUsername' },
        { header: 'assignedUserName', key: 'assignedUserName', width: 25 },
      ],
      await this.reports.storeRows(),
    );
    this.sendXlsx(res, 'stores.xlsx', buf);
  }

  // ---------- Import xlsx ----------
  @Post('products/import')
  @UseInterceptors(FileInterceptor('file'))
  async importProducts(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('กรุณาแนบไฟล์ .xlsx');
    const rows = await this.excel.parse(file.buffer);
    return this.reports.importProducts(rows);
  }

  @Post('stores/import')
  @UseInterceptors(FileInterceptor('file'))
  async importStores(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('กรุณาแนบไฟล์ .xlsx');
    const rows = await this.excel.parse(file.buffer);
    return this.reports.importStores(rows);
  }

  // ---------- PDF slip (Bplus) ----------
  @Get('transactions/:docNo/slip.pdf')
  async slip(@Param('docNo') docNo: string, @Res() res: Response) {
    const data = await this.reports.slipData(docNo);
    const buf = await this.pdf.renderSlip(data);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${docNo}.pdf"`,
      'Content-Length': buf.length,
    });
    res.end(buf);
  }

  private sendXlsx(res: Response, filename: string, buf: Buffer) {
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buf.length,
    });
    res.end(buf);
  }
}
