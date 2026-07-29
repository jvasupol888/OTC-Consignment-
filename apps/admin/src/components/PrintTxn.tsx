import React from 'react';

const formatPrintDate = (dateStr: string | Date | null | undefined) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear() + 543; // Thai year
  return `${day}/${month}/${year}`;
};

export default function PrintTxn({ txn, store }: { txn: any, store?: any }) {
  if (!txn) return null;

  let title = 'ใบทำรายการ';
  if (txn.docType === 'SALE') title = 'ใบทำรายการขาย';
  if (txn.docType === 'REQUEST') title = 'ใบเบิกสินค้า';
  if (txn.docType === 'CONSIGN') title = 'ใบฝากขายสินค้า';
  if (txn.docType === 'RETURN') title = 'ใบคืนสินค้า';

  let totalAmount = 0;
  if (txn.lines && txn.lines.length > 0) {
    totalAmount = txn.lines.reduce((sum: number, line: any) => sum + (Number(line.quantity) * Number(line.productPrice || 0)), 0);
  }

  return (
    <div className="w-full bg-white text-black p-12 text-[20px]" style={{ fontFamily: 'var(--font-kanit), sans-serif' }}>
      {/* Header section */}
      <div className="flex justify-between items-start mb-8 relative">
        <div>
          {/* Logo */}
          <img 
            src="https://vulcancoalition.com/wp-content/uploads/2024/11/Nutrition-New.webp" 
            alt="Logo" 
            className="w-48 mb-2" 
          />
        </div>
        <div className="text-center w-full absolute top-8 left-0 flex justify-center pointer-events-none">
          <h1 className="font-bold text-4xl mt-4">{title}</h1>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6 font-bold mt-16">
        <div>
          <div className="flex"><span className="w-24">ชื่อ:</span><span>{txn.storeName || '-'}</span></div>
          <div className="flex mt-2"><span className="w-24">ที่อยู่:</span><span className="flex-1 whitespace-pre-wrap">{txn.storeLocation || store?.location || '-'}</span></div>
          <div className="flex mt-2"><span className="w-24">จังหวัด:</span><span>{txn.storeProvince || store?.province || '-'}</span></div>
          <div className="flex mt-2"><span className="w-24">ตำแหน่งเก็บ:</span><span>{txn.storeStorageLocation || store?.storageLocation || '-'}</span></div>
        </div>
        <div>
          <div className="flex"><span className="w-36">ประเภทเอกสาร:</span><span>{title}</span></div>
          <div className="flex mt-2"><span className="w-36">เลขที่เอกสาร (Ref):</span><span>{txn.docNo}</span></div>
          <div className="flex mt-2"><span className="w-36">วันที่:</span><span>{formatPrintDate(txn.createdAt)}</span></div>
          <div className="flex mt-2"><span className="w-36">ผู้แทนฝ่ายขาย:</span><span>{txn.creatorName}</span></div>
        </div>
      </div>

      {/* Table */}
      <table className="w-full border-collapse border border-black mb-6 mt-4 text-lg">
        <thead>
          <tr>
            <th className="border border-black py-2 px-2 text-center bg-gray-100 font-bold w-12">ลำดับ</th>
            <th className="border border-black py-2 px-2 text-center bg-gray-100 font-bold w-32">SKU</th>
            <th className="border border-black py-2 px-2 text-center bg-gray-100 font-bold">รายการสินค้า</th>
            <th className="border border-black py-2 px-2 text-center bg-gray-100 font-bold w-20">จำนวน</th>
            <th className="border border-black py-2 px-2 text-center bg-gray-100 font-bold w-28">ราคาต่อหน่วย</th>
            <th className="border border-black py-2 px-2 text-center bg-gray-100 font-bold w-28">ราคารวม</th>
          </tr>
        </thead>
        <tbody>
          {txn.lines?.map((line: any, idx: number) => (
            <tr key={idx}>
              <td className="border border-black py-3 px-2 text-center font-medium">{idx + 1}</td>
              <td className="border border-black py-3 px-2 text-center font-medium">{line.productSku || '-'}</td>
              <td className="border border-black py-3 px-2 font-medium">
                {line.productName}
              </td>
              <td className="border border-black py-3 px-2 text-right font-medium">{line.quantity}</td>
              <td className="border border-black py-3 px-2 text-right font-medium">฿{Number(line.productPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td className="border border-black py-3 px-2 text-right font-medium">฿{(Number(line.quantity) * Number(line.productPrice || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          ))}
          {(!txn.lines || txn.lines.length === 0) && (
            <tr>
              <td colSpan={6} className="border border-black py-3 px-2 text-center font-medium">ไม่มีรายการ</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Total Section */}
      <div className="flex justify-end mb-8">
        <table className="border-collapse border border-black w-72">
          <tbody>
            <tr>
              <td className="border border-black py-2 px-4 bg-gray-100 font-bold text-center">ราคาสินค้าทั้งหมด</td>
              <td className="border border-black py-2 px-4 text-right font-bold text-[21px]">
                ฿{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Remarks Section */}
      <div className="border border-black p-4 mt-8 min-h-[100px]">
        <div className="font-bold mb-2">หมายเหตุ: <span className="font-medium">{txn.remark || '-'}</span></div>
      </div>
    </div>
  );
}
