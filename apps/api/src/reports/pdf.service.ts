import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import puppeteer, { type Browser } from 'puppeteer';

const DOC_TYPE_TH: Record<string, string> = {
  REQUEST: 'ใบเบิกสินค้า (Request)',
  CONSIGN: 'ใบฝากขาย (Consign)',
  SALE: 'ใบแจ้งขาย (Sale)',
  RETURN: 'ใบคืนสินค้า (Return)',
};

export interface SlipData {
  docNo: string;
  docType: string;
  returnSubtype: string | null;
  status: string;
  createdByName: string | null;
  storeName: string | null;
  createdAt: Date | string;
  remark: string | null;
  lines: { productCode: string; productName: string; quantity: number }[];
}

@Injectable()
export class PdfService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private browser?: Browser;

  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.connected) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    return this.browser;
  }

  async onModuleDestroy() {
    await this.browser?.close();
  }

  /** สร้างสลิป PDF (A5) สำหรับเปิดบิลต่อในระบบ ERP Bplus */
  async renderSlip(data: SlipData): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(this.html(data), { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A5',
        printBackground: true,
        margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' },
      });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  private html(d: SlipData): string {
    const dt = new Date(d.createdAt);
    const dateStr = dt.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
    const rows = d.lines
      .map(
        (l, i) => `<tr>
          <td class="c">${i + 1}</td>
          <td>${esc(l.productCode)}</td>
          <td>${esc(l.productName)}</td>
          <td class="r">${l.quantity}</td>
        </tr>`,
      )
      .join('');
    const total = d.lines.reduce((s, l) => s + l.quantity, 0);

    return `<!doctype html><html lang="th"><head><meta charset="utf-8">
    <style>
      * { font-family: "Sarabun", "Leelawadee UI", "Tahoma", sans-serif; }
      body { color: #111; font-size: 12px; }
      h1 { font-size: 18px; margin: 0 0 2px; }
      .muted { color: #666; }
      .head { display:flex; justify-content:space-between; align-items:flex-start;
              border-bottom:2px solid #111; padding-bottom:8px; margin-bottom:10px; }
      .meta td { padding: 2px 6px 2px 0; vertical-align: top; }
      .meta .k { color:#666; white-space:nowrap; }
      table.items { width:100%; border-collapse:collapse; margin-top:10px; }
      table.items th, table.items td { border:1px solid #999; padding:5px 6px; }
      table.items th { background:#f0f0f0; text-align:left; }
      .c { text-align:center; } .r { text-align:right; }
      .total { text-align:right; font-weight:bold; margin-top:8px; }
      .sign { display:flex; justify-content:space-between; margin-top:36px; }
      .sign div { width:45%; border-top:1px solid #111; text-align:center; padding-top:4px; }
      .badge { display:inline-block; padding:2px 8px; border-radius:4px; font-size:11px;
               background:#eef; border:1px solid #99c; }
    </style></head><body>
      <div class="head">
        <div>
          <h1>${esc(DOC_TYPE_TH[d.docType] ?? d.docType)}</h1>
          <div class="muted">Nutrition Profess Pub Co., Ltd. — ระบบฝากขาย OTC</div>
        </div>
        <div style="text-align:right">
          <div><b>${esc(d.docNo)}</b></div>
          <div class="badge">${esc(d.status)}</div>
        </div>
      </div>

      <table class="meta">
        <tr><td class="k">วันที่ทำรายการ</td><td>${esc(dateStr)}</td>
            <td class="k">พนักงานขาย</td><td>${esc(d.createdByName ?? '-')}</td></tr>
        <tr><td class="k">ร้านยา/สถานที่</td><td>${esc(d.storeName ?? '-')}</td>
            <td class="k">ประเภทย่อย</td><td>${esc(d.returnSubtype ?? '-')}</td></tr>
        ${d.remark ? `<tr><td class="k">หมายเหตุ</td><td colspan="3">${esc(d.remark)}</td></tr>` : ''}
      </table>

      <table class="items">
        <thead><tr><th class="c">#</th><th>รหัสสินค้า</th><th>ชื่อสินค้า</th><th class="r">จำนวน</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="total">รวมทั้งสิ้น: ${total} หน่วย</div>

      <div class="sign">
        <div>ผู้จัดทำ (เซลล์)</div>
        <div>ผู้อนุมัติ (แอดมิน)</div>
      </div>
    </body></html>`;
  }
}

function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}
