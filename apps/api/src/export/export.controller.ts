import { Controller, Get, Param, Res, UseGuards, Query, ForbiddenException } from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from './export.service.js';
import { JwtAuthGuard, RolesGuard } from '../auth/guards.js';
import { Roles } from '../auth/decorators.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  // 1. ดาวน์โหลดเอกสาร PDF (สลิปฝากขาย)
  @Get('transactions/:docNo/pdf')
  async downloadTransactionPdf(@Param('docNo') docNo: string, @Res() res: Response) {
    const pdfBuffer = await this.exportService.generateTransactionPdf(docNo);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=consignment-${docNo}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.end(pdfBuffer);
  }

  // 2. ดาวน์โหลด Excel Master Data (เฉพาะแอดมิน)
  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @Get('master/:type/excel')
  async downloadMasterDataExcel(
    @Param('type') type: 'products' | 'stores' | 'users',
    @Res() res: Response
  ) {
    if (!['products', 'stores', 'users'].includes(type)) {
      throw new ForbiddenException('ประเภทข้อมูลไม่ถูกต้อง');
    }
    
    const excelBuffer = await this.exportService.generateMasterDataExcel(type);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=export-${type}.xlsx`);
    res.setHeader('Content-Length', excelBuffer.length);
    
    res.end(excelBuffer);
  }
}
