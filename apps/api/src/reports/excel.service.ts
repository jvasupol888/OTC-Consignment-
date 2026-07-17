import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';

@Injectable()
export class ExcelService {
  /** สร้างไฟล์ xlsx จาก columns + rows คืน Buffer */
  async build(
    sheetName: string,
    columns: { header: string; key: string; width?: number }[],
    rows: Record<string, unknown>[],
  ): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(sheetName);
    ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 20 }));
    ws.getRow(1).font = { bold: true };
    rows.forEach((r) => ws.addRow(r));
    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  /** อ่านไฟล์ xlsx (sheet แรก) → array ของ object ตาม header แถวที่ 1 */
  async parse(buffer: Buffer): Promise<Record<string, string>[]> {
    const wb = new ExcelJS.Workbook();
    // exceljs รับ Buffer/ArrayBuffer — cast กัน type generic ของ @types/node ชนกัน
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) return [];

    const headers: string[] = [];
    ws.getRow(1).eachCell((cell, col) => {
      headers[col] = String(cell.value ?? '').trim();
    });

    const out: Record<string, string>[] = [];
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const obj: Record<string, string> = {};
      let hasValue = false;
      row.eachCell({ includeEmpty: false }, (cell, col) => {
        const key = headers[col];
        if (!key) return;
        let v = cell.value;
        if (v && typeof v === 'object' && 'text' in v) v = (v as { text: string }).text; // rich text/hyperlink
        const str = v == null ? '' : String(v).trim();
        obj[key] = str;
        if (str) hasValue = true;
      });
      if (hasValue) out.push(obj);
    }
    return out;
  }
}
