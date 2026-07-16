/**
 * ตรรกะ Inventory State Machine (pure, ไม่ผูกกับ DB)
 * แชร์ระหว่าง API (คำนวณ delta จริง) และ frontend (แสดง preview ผลต่อสต็อก)
 *
 * หลักการ normalize (ต่างจากระบบเดิม):
 *   - "พนักงานขาย" = createdBy เสมอ  → คลัง SALE
 *   - "ร้านยา"     = storeId          → คลัง PHARMACY
 */
import type { DocType, ReturnSubtype, LocationType } from './enums.js';

export interface StockDelta {
  locationType: LocationType;
  /** userId (ถ้า SALE) หรือ storeId (ถ้า PHARMACY) */
  locationRefId: string;
  productId: string;
  /** บวก = เพิ่มสต็อก, ลบ = ตัดสต็อก */
  delta: number;
}

export interface TxnContext {
  docType: DocType;
  returnSubtype?: ReturnSubtype | null;
  createdBy: string; // พนักงานขาย
  storeId?: string | null; // ร้านยา (ถ้ามี)
}

export interface TxnLine {
  productId: string;
  quantity: number;
}

/**
 * คำนวณผลต่อสต็อกเมื่อ "อนุมัติ" (Approve) รายการหนึ่งใบ
 * คืน list ของ delta ที่ต้องนำไป apply ภายใน DB transaction
 */
export function computeApprovalDeltas(ctx: TxnContext, lines: TxnLine[]): StockDelta[] {
  const deltas: StockDelta[] = [];
  const sale = ctx.createdBy;
  const store = ctx.storeId ?? '';

  for (const line of lines) {
    const p = line.productId;
    const q = line.quantity;

    switch (ctx.docType) {
      case 'REQUEST': // เบิกเข้าสต็อกเซลล์ (จากบริษัท)
        deltas.push(sd('SALE', sale, p, +q));
        break;

      case 'CONSIGN': // ฝากขาย: ตัดเซลล์ → เพิ่มร้านยา
        deltas.push(sd('SALE', sale, p, -q));
        deltas.push(sd('PHARMACY', store, p, +q));
        break;

      case 'SALE': // ขายจริง: ตัดสต็อกร้านยา
        deltas.push(sd('PHARMACY', store, p, -q));
        break;

      case 'RETURN':
        if (ctx.returnSubtype === 'PHARMACY_TO_SALE') {
          deltas.push(sd('PHARMACY', store, p, -q));
          deltas.push(sd('SALE', sale, p, +q));
        } else if (ctx.returnSubtype === 'SALE_TO_COMPANY') {
          deltas.push(sd('SALE', sale, p, -q));
        }
        break;
    }
  }
  return deltas;
}

/** ผลต่อสต็อกเมื่อ "ยกเลิก" รายการที่อนุมัติแล้ว = ตรงกันข้ามกับตอนอนุมัติ */
export function computeRollbackDeltas(ctx: TxnContext, lines: TxnLine[]): StockDelta[] {
  return computeApprovalDeltas(ctx, lines).map((d) => ({ ...d, delta: -d.delta }));
}

function sd(
  locationType: LocationType,
  locationRefId: string,
  productId: string,
  delta: number,
): StockDelta {
  return { locationType, locationRefId, productId, delta };
}
