import React from 'react';

export default function InventoryView({ invSubTab, inventoryList, products, users, stores }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
        <h3 className="text-lg font-bold text-slate-700 mb-4">
          {invSubTab === 'sale' ? 'สต็อกสินค้าคงเหลือส่วนตัวของพนักงานขาย (Sale In-hand Stock)' : 'สต็อกสินค้าฝากขายในตู้ร้านขายยา (Pharmacy Consigned Stock)'}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-base border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100">
                <th className="p-3 w-16 text-center">No.</th>
                <th className="p-3">{invSubTab === 'sale' ? 'รหัส/ชื่อเซลล์' : 'รหัส/ชื่อร้านค้า'}</th>
                <th className="p-3">รหัสสินค้า (SKU)</th>
                <th className="p-3">ชื่อสินค้า</th>
                <th className="p-3">ราคาสินค้า</th>
                <th className="p-3 text-right">จำนวนสต็อกคงเหลือ</th>
                <th className="p-3 text-right">มูลค่ารวม</th>
                <th className="p-3 text-center">อัปเดตล่าสุด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventoryList
                ?.filter((inv: any) => inv.locationType === (invSubTab === 'sale' ? 'SALE' : 'PHARMACY'))
                .map((inv: any, index: number) => {
                  const prd = products?.find((p: any) => p.id === inv.productId);
                  let ownerName = '-';
                  if (invSubTab === 'sale') {
                    const usr = users?.find((u: any) => u.id === inv.saleUserId);
                    ownerName = usr ? `${usr.code} - ${usr.fullName}` : '-';
                  } else {
                    const st = stores?.find((s: any) => s.id === inv.storeId);
                    ownerName = st ? `${st.code} - ${st.name}` : '-';
                  }

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 text-center text-slate-500">{index + 1}</td>
                      <td className="p-3 font-bold text-slate-800">{ownerName}</td>
                      <td className="p-3 text-slate-600 font-semibold">{prd?.sku || '-'}</td>
                      <td className="p-3 text-slate-600">{prd?.name || '-'}</td>
                      <td className="p-3 text-slate-600">฿{Number(prd?.price || 0).toLocaleString()}</td>
                      <td className="p-3 text-right font-black text-slate-800">{inv.quantity} ชิ้น</td>
                      <td className="p-3 text-right font-black text-emerald-600">฿{(inv.quantity * Number(prd?.price || 0)).toLocaleString()}</td>
                      <td className="p-3 text-center text-slate-400">{new Date(inv.updatedAt).toLocaleString('th-TH')}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
