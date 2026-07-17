'use client';
import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiBlob, apiUpload, openFile } from '../../../lib/api';
import { useToast, Modal } from '../../../lib/ui';

interface Product {
  id: string; code: string; sku: string; name: string;
  price: string; startDate: string | null; endDate: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}
type Form = Partial<Product> & { price?: string };

export default function ProductsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [edit, setEdit] = useState<Form | null>(null);

  const { data = [], isLoading } = useQuery({ queryKey: ['products'], queryFn: () => api<Product[]>('/products') });
  const refresh = () => qc.invalidateQueries({ queryKey: ['products'] });

  const save = useMutation({
    mutationFn: (f: Form) => api('/products', {
      method: 'POST',
      body: JSON.stringify({
        id: f.id, sku: f.sku, name: f.name, price: Number(f.price ?? 0),
        startDate: f.startDate || null, endDate: f.endDate || null, status: f.status ?? 'ACTIVE',
      }),
    }),
    onSuccess: () => { toast.show('บันทึกแล้ว'); setEdit(null); refresh(); },
    onError: (e) => toast.show((e as Error).message, 'err'),
  });

  const toggle = useMutation({
    mutationFn: (p: Product) => api(`/products/${p.id}/status`, {
      method: 'PATCH', body: JSON.stringify({ status: p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
    }),
    onSuccess: () => refresh(),
    onError: (e) => toast.show((e as Error).message, 'err'),
  });

  const onImport = async (file: File) => {
    try {
      const r = await apiUpload<{ inserted: number; skipped: number; errors: unknown[] }>('/reports/products/import', file);
      toast.show(`นำเข้า ${r.inserted} รายการ, ข้าม ${r.skipped}`);
      refresh();
    } catch (e) { toast.show((e as Error).message, 'err'); }
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>สินค้า ({data.length})</h2>
        <div className="btn-row">
          <button className="btn sm" onClick={async () => openFile(await apiBlob('/reports/products.xlsx'), 'products.xlsx')}>ส่งออก xlsx</button>
          <button className="btn sm" onClick={() => fileRef.current?.click()}>นำเข้า xlsx</button>
          <input ref={fileRef} type="file" accept=".xlsx" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ''; }} />
          <button className="btn sm primary" onClick={() => setEdit({ status: 'ACTIVE' })}>+ เพิ่มสินค้า</button>
        </div>
      </div>

      {isLoading ? <div className="empty">กำลังโหลด…</div> : (
        <table>
          <thead><tr><th>รหัส</th><th>SKU</th><th>ชื่อสินค้า</th><th className="r">ราคา</th><th>สิ้นสุด</th><th>สถานะ</th><th className="r">จัดการ</th></tr></thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id}>
                <td>{p.code}</td><td>{p.sku}</td><td>{p.name}</td>
                <td className="r">{Number(p.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td>{p.endDate ?? '-'}</td>
                <td><span className={`badge ${p.status}`}>{p.status}</span></td>
                <td className="r">
                  <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn sm" onClick={() => setEdit({ ...p, price: String(p.price) })}>แก้ไข</button>
                    <button className="btn sm" onClick={() => toggle.mutate(p)}>{p.status === 'ACTIVE' ? 'ระงับ' : 'เปิด'}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {edit && (
        <Modal title={edit.id ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า'} onClose={() => setEdit(null)}
          footer={<>
            <button className="btn" onClick={() => setEdit(null)}>ยกเลิก</button>
            <button className="btn primary" disabled={save.isPending || !edit.sku || !edit.name} onClick={() => save.mutate(edit)}>บันทึก</button>
          </>}>
          <Field label="SKU"><input className="input" value={edit.sku ?? ''} onChange={(e) => setEdit({ ...edit, sku: e.target.value })} /></Field>
          <Field label="ชื่อสินค้า"><input className="input" value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
          <Field label="ราคา"><input className="input" type="number" step="0.01" value={edit.price ?? ''} onChange={(e) => setEdit({ ...edit, price: e.target.value })} /></Field>
          <Field label="วันเริ่มขาย"><input className="input" type="date" value={edit.startDate ?? ''} onChange={(e) => setEdit({ ...edit, startDate: e.target.value })} /></Field>
          <Field label="วันสิ้นสุด"><input className="input" type="date" value={edit.endDate ?? ''} onChange={(e) => setEdit({ ...edit, endDate: e.target.value })} /></Field>
          <Field label="สถานะ">
            <select className="input" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as Product['status'] })}>
              <option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option>
            </select>
          </Field>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}
