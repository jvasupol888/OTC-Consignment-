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

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Sarabun', sans-serif; padding: 40px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #10b981; padding-bottom: 20px; }
          .header h1 { font-size: 28px; margin: 0; color: #065f46; }
          .header p { font-size: 14px; margin: 5px 0 0; color: #6b7280; }
          .info-box { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px; }
          .info-item { margin-bottom: 8px; }
          .info-label { font-weight: bold; color: #4b5563; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
          th { background-color: #f3f4f6; color: #374151; font-weight: bold; text-align: left; padding: 10px; border-bottom: 2px solid #e5e7eb; }
          td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .total-row { font-weight: bold; background-color: #f9fafb; }
          .footer { margin-top: 50px; display: flex; justify-content: space-between; text-align: center; font-size: 14px; }
          .signature { border-top: 1px dashed #9ca3af; padding-top: 10px; width: 200px; margin-top: 60px; }
          .status-badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; }
          .status-APPROVED { background: #d1fae5; color: #065f46; }
          .status-PENDING { background: #fef3c7; color: #92400e; }
          .status-REJECTED { background: #fee2e2; color: #991b1b; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>เอกสารรายการฝากขาย (Consignment Slip)</h1>
          <p>Nutrition Profess Co., Ltd.</p>
        </div>
        
        <div class="info-box">
          <div>
            <div class="info-item"><span class="info-label">เลขที่เอกสาร:</span> ${txn.docNo}</div>
            <div class="info-item"><span class="info-label">ประเภทรายการ:</span> ${txn.docType} ${txn.returnSubtype ? `(${txn.returnSubtype})` : ''}</div>
            <div class="info-item"><span class="info-label">สถานะ:</span> <span class="status-badge status-${txn.status}">${txn.status}</span></div>
          </div>
          <div>
            <div class="info-item"><span class="info-label">วันที่ทำรายการ:</span> ${new Date(txn.createdAt).toLocaleString('th-TH')}</div>
            <div class="info-item"><span class="info-label">พนักงาน:</span> ${txn.creatorName}</div>
            <div class="info-item"><span class="info-label">ร้านค้าเครือข่าย:</span> ${txn.storeName || '-'}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>รหัสสินค้า</th>
              <th>รายการสินค้า</th>
              <th class="text-right">ราคา/หน่วย</th>
              <th class="text-right">จำนวน</th>
              <th class="text-right">มูลค่ารวม</th>
            </tr>
          </thead>
          <tbody>
            ${txn.lines.map((l, i) => `
              <tr>
                <td class="text-center">${i + 1}</td>
                <td>${l.productSku}</td>
                <td>${l.productName}</td>
                <td class="text-right">฿${Number(l.productPrice).toLocaleString()}</td>
                <td class="text-right">${l.quantity}</td>
                <td class="text-right">฿${(l.quantity * Number(l.productPrice)).toLocaleString()}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="4" class="text-right">รวมมูลค่าทั้งสิ้น</td>
              <td class="text-right">${txn.lines.reduce((sum, l) => sum + l.quantity, 0)}</td>
              <td class="text-right text-emerald-600">฿${txn.lines.reduce((sum, l) => sum + (l.quantity * Number(l.productPrice)), 0).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        ${txn.remark ? `<div style="margin-top: 20px; font-size: 14px;"><span class="info-label">หมายเหตุ:</span> ${txn.remark}</div>` : ''}

        <div class="footer">
          <div>
            <div class="signature">${txn.creatorName}</div>
            <div>ผู้จัดทำรายการ (เซลล์)</div>
          </div>
          <div>
            <div class="signature"></div>
            <div>ผู้รับสินค้า/ร้านค้า</div>
          </div>
          <div>
            <div class="signature">${txn.status === 'APPROVED' ? 'ผู้อนุมัติระบบ' : ''}</div>
            <div>ผู้อนุมัติ (สำนักงานใหญ่)</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // ตั้งค่า Content ให้ page รอจนกว่า network จะหยุดทำงาน (เพื่อให้ font โหลดเสร็จ)
    await page.setContent(htmlContent, { waitUntil: 'load' });
    
    // พิมพ์เป็น PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
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
