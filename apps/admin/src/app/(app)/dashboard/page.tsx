'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';

interface Stats {
  pendingApprovals: number;
  totalSaleStock: number;
  totalPharmacyStock: number;
  totalStock: number;
  totalSales: number;
  totalProducts: number;
  totalStores: number;
  expiringSoon: number;
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<Stats>('/dashboard/stats'),
  });

  if (isLoading) return <div className="muted">กำลังโหลด…</div>;
  if (error) return <div className="error-text">{(error as Error).message}</div>;
  if (!data) return null;

  const cards = [
    { label: 'รออนุมัติ', value: data.pendingApprovals, cls: data.pendingApprovals > 0 ? 'alert' : '' },
    { label: 'สต็อกรวม (หน่วย)', value: data.totalStock, cls: '' },
    { label: 'สต็อกเซลล์', value: data.totalSaleStock, cls: '' },
    { label: 'สต็อกร้านยา', value: data.totalPharmacyStock, cls: '' },
    { label: 'พนักงานขาย', value: data.totalSales, cls: '' },
    { label: 'สินค้า', value: data.totalProducts, cls: '' },
    { label: 'ร้านยา', value: data.totalStores, cls: '' },
    { label: 'ใกล้หมดอายุ (≤14 วัน)', value: data.expiringSoon, cls: data.expiringSoon > 0 ? 'danger' : '' },
  ];

  return (
    <div className="grid stats">
      {cards.map((c) => (
        <div key={c.label} className="card stat">
          <div className="label">{c.label}</div>
          <div className={`value ${c.cls}`}>{c.value.toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}
