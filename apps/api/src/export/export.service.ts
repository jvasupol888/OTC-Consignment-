import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import puppeteer from 'puppeteer';
import ExcelJS from 'exceljs';
import { DATABASE } from '../db/db.module.js';
import { Database, products, stores, users } from '@otc/db';
import { TransactionsService } from '../transactions/transactions.service.js';

@Injectable()
export class ExportService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly txnsService: TransactionsService,
  ) {}

  // -----------------------------------------------------------------
  // 1. สร้าง PDF ด้วย Puppeteer + Sarabun Font (สำหรับเอกสาร)
  // -----------------------------------------------------------------
  async generateTransactionPdf(docNo: string): Promise<Buffer> {
    const txn = await this.txnsService.findByDocNo(docNo);
    if (!txn) {
      throw new NotFoundException(`ไม่พบเอกสาร ${docNo}`);
    }

    let title = 'ใบทำรายการ';
    if (txn.docType === 'SALE') title = 'ใบทำรายการขาย';
    if (txn.docType === 'REQUEST') title = 'ใบเบิกสินค้า';
    if (txn.docType === 'CONSIGN') title = 'ใบฝากขายสินค้า';
    if (txn.docType === 'RETURN') title = 'ใบคืนสินค้า';

    const formatPrintDate = (dateStr: string | Date | null | undefined) => {
      if (!dateStr) return '-';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear() + 543;
      return `${day}/${month}/${year}`;
    };

    let totalAmount = 0;
    if (txn.lines && txn.lines.length > 0) {
      totalAmount = txn.lines.reduce((sum: number, line: any) => sum + (Number(line.quantity) * Number(line.productPrice || 0)), 0);
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          *, ::before, ::after { box-sizing: border-box; }
          body { 
            font-family: 'Kanit', sans-serif; 
            font-size: 16px; 
            padding: 48px; 
            margin: 0; 
            width: 210mm; /* A4 width */
            color: #000;
            line-height: 1.5;
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
          }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; position: relative; }
          .logo { width: 192px; margin-bottom: 8px; }
          .title-wrapper { text-align: center; width: 100%; position: absolute; top: 32px; left: 0; display: flex; justify-content: center; }
          .title { font-weight: 600; font-size: 24px; margin: 16px 0 0 0; }
          
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 32px; row-gap: 16px; margin-bottom: 24px; margin-top: 64px; }
          .flex-row { display: flex; margin-top: 8px; font-weight: 600; }
          .flex-row.first { margin-top: 0; }
          .w-24 { width: 96px; flex-shrink: 0; }
          .w-36 { width: 144px; flex-shrink: 0; }
          .flex-1 { flex: 1 1 0%; white-space: pre-wrap; font-weight: 400; }
          
          table.main-table { width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 24px; margin-top: 16px; font-size: 14px; }
          .main-table th, .main-table td { border: 1px solid #000; }
          .main-table th { padding: 8px 8px; text-align: center; background-color: #f3f4f6; font-weight: 600; }
          .main-table td { padding: 12px 8px; font-weight: 400; }
          .text-center { text-align: center; }
          .text-left { text-align: left; }
          .text-right { text-align: right; }
          .w-12 { width: 48px; }
          .w-32 { width: 128px; }
          .w-20 { width: 80px; }
          .w-28 { width: 112px; }
          
          .total-wrapper { display: flex; justify-content: flex-end; margin-bottom: 32px; }
          table.total-table { border-collapse: collapse; border: 1px solid #000; width: 288px; }
          .total-table td { border: 1px solid #000; padding: 8px 16px; }
          .bg-gray-100 { background-color: #f3f4f6; }
          .font-bold { font-weight: 600; }
          .text-21 { font-size: 16px; }
          
          .remark-box { border: 1px solid #000; padding: 16px; margin-top: 32px; min-height: 100px; }
          .mb-2 { margin-bottom: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <img src="https://vulcancoalition.com/wp-content/uploads/2024/11/Nutrition-New.webp" alt="Logo" class="logo" />
          </div>
          <div class="title-wrapper">
            <h1 class="title">${title}</h1>
          </div>
        </div>

        <div class="info-grid">
          <div>
            <div class="flex-row first"><span class="w-24">ชื่อ:</span><span class="flex-1" style="font-weight: 600;">${txn.storeName || '-'}</span></div>
            <div class="flex-row"><span class="w-24">ที่อยู่:</span><span class="flex-1" style="font-weight: 600;">${txn.storeLocation || '-'}</span></div>
            <div class="flex-row"><span class="w-24">จังหวัด:</span><span class="flex-1" style="font-weight: 600;">${txn.storeProvince || '-'}</span></div>
            <div class="flex-row"><span class="w-24">ตำแหน่งเก็บ:</span><span class="flex-1" style="font-weight: 600;">${txn.storeStorageLocation || '-'}</span></div>
          </div>
          <div>
            <div class="flex-row first"><span class="w-36">ประเภทเอกสาร:</span><span class="flex-1" style="font-weight: 600;">${title}</span></div>
            <div class="flex-row"><span class="w-36">เลขที่เอกสาร (Ref):</span><span class="flex-1" style="font-weight: 600;">${txn.docNo}</span></div>
            <div class="flex-row"><span class="w-36">วันที่:</span><span class="flex-1" style="font-weight: 600;">${formatPrintDate(txn.createdAt)}</span></div>
            <div class="flex-row"><span class="w-36">ผู้แทนฝ่ายขาย:</span><span class="flex-1" style="font-weight: 600;">${txn.creatorName}</span></div>
          </div>
        </div>

        <table class="main-table">
          <thead>
            <tr>
              <th class="w-12">ลำดับ</th>
              <th class="w-32">SKU</th>
              <th>รายการสินค้า</th>
              <th class="w-20">จำนวน</th>
              <th class="w-28">ราคาต่อหน่วย</th>
              <th class="w-28">ราคารวม</th>
            </tr>
          </thead>
          <tbody>
            ${txn.lines && txn.lines.length > 0 ? txn.lines.map((l: any, i: number) => `
              <tr>
                <td class="text-center">${i + 1}</td>
                <td class="text-center">${l.productSku || '-'}</td>
                <td class="text-left">${l.productName}</td>
                <td class="text-right">${l.quantity}</td>
                <td class="text-right">฿${Number(l.productPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="text-right">฿${(Number(l.quantity) * Number(l.productPrice || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="6" class="text-center">ไม่มีรายการ</td>
              </tr>
            `}
          </tbody>
        </table>

        <div class="total-wrapper">
          <table class="total-table">
            <tbody>
              <tr>
                <td class="bg-gray-100 font-bold text-center">ราคาสินค้าทั้งหมด</td>
                <td class="text-right font-bold text-21">
                  ฿${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="remark-box">
          <div class="font-bold mb-2">หมายเหตุ: <span style="font-weight: 400;">${txn.remark || '-'}</span></div>
        </div>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // ตั้งค่า Content ให้ page
    await page.setContent(htmlContent, { waitUntil: 'load' });
    
    // รอจนกว่าฟอนต์โหลดเสร็จสมบูรณ์ (สำคัญมาก)
    await page.evaluate('document.fonts.ready');
    
    // พิมพ์เป็น PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      printBackground: true,
    });
    
    await browser.close();
    
    return Buffer.from(pdfBuffer);
  }

  // -----------------------------------------------------------------
  // 2. ส่งออก Excel สำหรับ Master Data
  // -----------------------------------------------------------------
  async generateMasterDataExcel(type: 'products' | 'stores' | 'users'): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Wesell Consignment';
    
    if (type === 'products') {
      const sheet = workbook.addWorksheet('Products');
      sheet.columns = [
        { header: 'รหัสสินค้า', key: 'code', width: 15 },
        { header: 'SKU', key: 'sku', width: 20 },
        { header: 'ชื่อสินค้า', key: 'name', width: 40 },
        { header: 'ราคา', key: 'price', width: 15 },
        { header: 'สถานะ', key: 'status', width: 15 },
      ];
      
      const pRows = await this.db.select().from(products);
      pRows.forEach(p => {
        sheet.addRow({ code: p.code, sku: p.sku, name: p.name, price: p.price, status: p.status });
      });
      
    } else if (type === 'stores') {
      const sheet = workbook.addWorksheet('Stores');
      sheet.columns = [
        { header: 'รหัสร้าน', key: 'code', width: 15 },
        { header: 'ชื่อร้านค้า', key: 'name', width: 40 },
        { header: 'ทำเล/ที่ตั้ง', key: 'location', width: 40 },
      ];
      
      const sRows = await this.db.select().from(stores);
      sRows.forEach(s => {
        sheet.addRow({ code: s.code, name: s.name, location: s.location || '' });
      });
      
    } else if (type === 'users') {
      const sheet = workbook.addWorksheet('Users');
      sheet.columns = [
        { header: 'รหัสพนักงาน', key: 'code', width: 15 },
        { header: 'ชื่อล็อกอิน', key: 'username', width: 20 },
        { header: 'ชื่อ-นามสกุล', key: 'fullName', width: 30 },
        { header: 'ตำแหน่ง', key: 'role', width: 15 },
        { header: 'สถานะ', key: 'status', width: 15 },
      ];
      
      const uRows = await this.db.select().from(users);
      uRows.forEach(u => {
        sheet.addRow({ code: u.code, username: u.username, fullName: u.fullName, role: u.role, status: u.status });
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
