import React from 'react';

export default function DashboardView({ stats, recentTxns }: { stats: any, recentTxns: any[] }) {
  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-1 hover:shadow-md transition-shadow">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">รายการรออนุมัติ</span>
          <h3 className="text-3xl font-black text-amber-500">{stats.pendingCount} <span className="text-xs font-normal text-slate-400">ใบ</span></h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-1 hover:shadow-md transition-shadow">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">พนักงานขายที่ทำงานอยู่</span>
          <h3 className="text-3xl font-black text-indigo-600">{stats.activeSalesCount} <span className="text-xs font-normal text-slate-400">คน</span></h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-1 hover:shadow-md transition-shadow">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">ยอดขายสินค้าฝากขายสะสม</span>
          <h3 className="text-3xl font-black text-emerald-600">฿{stats.totalSalesValue?.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-1 hover:shadow-md transition-shadow">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">ร้านค้าเครือข่ายฝากขาย</span>
          <h3 className="text-3xl font-black text-slate-700">{stats.totalStores} <span className="text-xs font-normal text-slate-400">ร้าน</span></h3>
        </div>
      </div>

      {/* Chart & Recent Activity */}
      <div className="grid grid-cols-3 gap-6">
        {/* SVG Chart */}
        <div className="col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <h4 className="text-sm font-bold text-slate-700 mb-4">แนวโน้มยอดขายสัปดาห์นี้ (7 วันล่าสุด)</h4>
          {stats.chartData?.length > 0 ? (
            <div>
              {(() => {
                const maxValue = Math.max(...stats.chartData.map((d: any) => d.value), 1000);
                const points = stats.chartData.map((d: any, i: number) => {
                  const x = 50 + (i * (430 / Math.max(stats.chartData.length - 1, 1)));
                  const y = 170 - (d.value / maxValue) * 150;
                  return `${x},${y}`;
                }).join(' ');

                return (
                  <svg viewBox="0 0 500 200" className="w-full h-48">
                    <line x1="50" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="50" y1="70" x2="480" y2="70" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="50" y1="120" x2="480" y2="120" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="50" y1="170" x2="480" y2="170" stroke="#cbd5e1" strokeWidth="1.5" />
                    <polyline points={points} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    {stats.chartData.map((d: any, i: number) => {
                      const x = 50 + (i * (430 / Math.max(stats.chartData.length - 1, 1)));
                      const y = 170 - (d.value / maxValue) * 150;
                      return (
                        <g key={i}>
                          <circle cx={x} cy={y} r="4" fill="#10b981" />
                          <text x={x} y={y - 8} fontSize="8" fontWeight="bold" fill="#047857" textAnchor="middle">
                            ฿{d.value}
                          </text>
                          <text x={x} y="185" fontSize="8" fill="#64748b" textAnchor="middle">
                            {d.date.substring(5)}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-xs">ยังไม่มีข้อมูลยอดขายในสัปดาห์นี้</div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-4">ประวัติรายการล่าสุด</h4>
            <div className="space-y-3">
              {recentTxns.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between border-b border-slate-50 pb-2 hover:bg-slate-50 transition-colors rounded p-1">
                  <div>
                    <div className="font-bold text-xs text-slate-800">{t.docNo}</div>
                    <div className="text-[10px] text-slate-400">{t.creatorName} ({t.docType})</div>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                    t.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                    t.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                    t.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                  }`}>{t.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
