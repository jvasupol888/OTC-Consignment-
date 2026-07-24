import React from 'react';

export default function ApprovalsView({ pendingTxns, allTxns, handleViewTxnDetails }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
        <h3 className="text-lg font-bold text-slate-700 mb-4">รายการเอกสารรอการอนุมัติสต็อก</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-base border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100">
                <th className="p-3 w-16 text-center">No.</th>
                <th className="p-3">เลขที่เอกสาร</th>
                <th className="p-3">ประเภท</th>
                <th className="p-3">ผู้ทำรายการ</th>
                <th className="p-3">ร้านค้า</th>
                <th className="p-3">วันที่ส่งรายการ</th>
                <th className="p-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingTxns?.length > 0 ? (
                pendingTxns.map((t: any, index: number) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 text-center text-slate-500">{index + 1}</td>
                    <td className="p-3 font-bold text-slate-800">{t.docNo}</td>
                    <td className="p-3 font-semibold text-slate-600">{t.docType} {t.returnSubtype ? `(${t.returnSubtype})` : ''}</td>
                    <td className="p-3 text-slate-600">{t.creatorName}</td>
                    <td className="p-3 text-slate-600">{t.storeName || '-'}</td>
                    <td className="p-3 text-slate-400">{new Date(t.createdAt).toLocaleString('th-TH')}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleViewTxnDetails(t.docNo)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-transform transform active:scale-95 text-[17px]"
                      >
                        ตรวจสอบและอนุมัติ
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">🎉 ไม่มีรายการค้างรออนุมัติในระบบ</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
        <h3 className="text-lg font-bold text-slate-700 mb-4">บันทึกธุรกรรมทั้งหมดในระบบ</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-base border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100">
                <th className="p-3 w-16 text-center">No.</th>
                <th className="p-3">เลขที่เอกสาร</th>
                <th className="p-3">ประเภท</th>
                <th className="p-3">ผู้ส่ง</th>
                <th className="p-3">ร้านค้า</th>
                <th className="p-3">สถานะ</th>
                <th className="p-3">วันที่ทำรายการ</th>
                <th className="p-3 text-center">ดูข้อมูล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allTxns?.map((t: any, index: number) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3 text-center text-slate-500">{index + 1}</td>
                  <td className="p-3 font-bold text-slate-800">{t.docNo}</td>
                  <td className="p-3 text-slate-600">{t.docType}</td>
                  <td className="p-3 text-slate-600">{t.creatorName}</td>
                  <td className="p-3 text-slate-600">{t.storeName || '-'}</td>
                  <td className="p-3">
                    <span className={`text-[16px] px-2 py-0.5 rounded-full font-bold ${
                      t.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                      t.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                      t.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                    }`}>{t.status}</span>
                  </td>
                  <td className="p-3 text-slate-400">{new Date(t.createdAt).toLocaleString('th-TH')}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleViewTxnDetails(t.docNo)}
                      className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-semibold transition-transform transform active:scale-95 text-[17px]"
                    >
                      ดูรายละเอียด
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
