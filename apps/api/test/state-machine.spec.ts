import { describe, it, expect } from 'vitest';
import { computeApprovalDeltas, computeRollbackDeltas, type TxnContext } from '@otc/shared';

const SALE = 'user-sale-1';
const STORE = 'store-1';
const P = 'prod-1';
const lines = [{ productId: P, quantity: 10 }];

function find(deltas: ReturnType<typeof computeApprovalDeltas>, type: 'SALE' | 'PHARMACY') {
  return deltas.find((d) => d.locationType === type);
}

describe('Inventory State Machine — approval deltas', () => {
  it('REQUEST: เพิ่มสต็อกเซลล์', () => {
    const ctx: TxnContext = { docType: 'REQUEST', createdBy: SALE, storeId: null };
    const d = computeApprovalDeltas(ctx, lines);
    expect(d).toHaveLength(1);
    expect(find(d, 'SALE')).toMatchObject({ locationRefId: SALE, delta: 10 });
  });

  it('CONSIGN: ตัดเซลล์ เพิ่มร้านยา', () => {
    const ctx: TxnContext = { docType: 'CONSIGN', createdBy: SALE, storeId: STORE };
    const d = computeApprovalDeltas(ctx, lines);
    expect(find(d, 'SALE')).toMatchObject({ locationRefId: SALE, delta: -10 });
    expect(find(d, 'PHARMACY')).toMatchObject({ locationRefId: STORE, delta: 10 });
  });

  it('SALE: ตัดสต็อกร้านยา', () => {
    const ctx: TxnContext = { docType: 'SALE', createdBy: SALE, storeId: STORE };
    const d = computeApprovalDeltas(ctx, lines);
    expect(d).toHaveLength(1);
    expect(find(d, 'PHARMACY')).toMatchObject({ locationRefId: STORE, delta: -10 });
  });

  it('RETURN Pharmacy_to_Sale: ตัดร้านยา เพิ่มเซลล์', () => {
    const ctx: TxnContext = {
      docType: 'RETURN',
      returnSubtype: 'PHARMACY_TO_SALE',
      createdBy: SALE,
      storeId: STORE,
    };
    const d = computeApprovalDeltas(ctx, lines);
    expect(find(d, 'PHARMACY')).toMatchObject({ delta: -10 });
    expect(find(d, 'SALE')).toMatchObject({ delta: 10 });
  });

  it('RETURN Sale_to_Company: ตัดสต็อกเซลล์', () => {
    const ctx: TxnContext = {
      docType: 'RETURN',
      returnSubtype: 'SALE_TO_COMPANY',
      createdBy: SALE,
      storeId: null,
    };
    const d = computeApprovalDeltas(ctx, lines);
    expect(d).toHaveLength(1);
    expect(find(d, 'SALE')).toMatchObject({ delta: -10 });
  });
});

describe('Rollback = inverse ของ approval', () => {
  it('CONSIGN rollback คืนค่ากลับพอดี', () => {
    const ctx: TxnContext = { docType: 'CONSIGN', createdBy: SALE, storeId: STORE };
    const approve = computeApprovalDeltas(ctx, lines);
    const rollback = computeRollbackDeltas(ctx, lines);
    approve.forEach((a, i) => expect(rollback[i]!.delta).toBe(-a.delta));
  });
});
