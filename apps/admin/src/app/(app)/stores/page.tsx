'use client';
import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiBlob, apiUpload, openFile } from '../../../lib/api';
import { useToast, Modal } from '../../../lib/ui';

interface Store { id: string; code: string; name: string; location: string | null; assignedUserId: string | null; assignedUserName: string | null }
interface User { id: string; fullName: string; role: string; status: string }
type Form = Partial<Store>;

export default function StoresPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [edit, setEdit] = useState<Form | null>(null);
  const [transfer, setTransfer] = useState<Store | null>(null);
  const [newUser, setNewUser] = useState('');

  const { data = [], isLoading } = useQuery({ queryKey: ['stores'], queryFn: () => api<Store[]>('/stores') });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => api<User[]>('/users') });
  const sales = users.filter((u) => u.role === 'SALE' && u.status === 'ACTIVE');
  const refresh = () => qc.invalidateQueries({ queryKey: ['stores'] });

  const save = useMutation({
    mutationFn: (f: Form) => api('/stores', {
      method: 'POST',
      body: JSON.stringify({ id: f.id, name: f.name, location: f.location || null, assignedUserId: f.assignedUserId || null }),
    }),
    onSuccess: () => { toast.show('บันทึกแล้ว'); setEdit(null); refresh(); },
    onError: (e) => toast.show((e as Error).message, 'err'),
  });

  const doTransfer = useMutation({
    mutationFn: ({ storeId, newUserId }: { storeId: string; newUserId: string }) =>
      api('/stores/transfer', { method: 'POST', body: JSON.stringify({ storeId, newUserId }) }),
    onSuccess: () => { toast.show('โอนร้านแล้ว'); setTransfer(null); refresh(); },
    onError: (e) => toast.show((e as Error).message, 'err'),
  });

  const onImport = async (file: File) => {
    try {
      const r = await apiUpload<{ inserted: number; skipped: number }>('/reports/stores/import', file);
      toast.show(`นำเข้า ${r.inserted}, ข้าม ${r.skipped}`); refresh();
    } catch (e) { toast.show((e as Error).message, 'err'); }
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>ร้านยา ({data.length})</h2>
        <div className="btn-row">
          <button className="btn sm" onClick={async () => openFile(await apiBlob('/reports/stores.xlsx'), 'stores.xlsx')}>ส่งออก xlsx</button>
          <button className="btn sm" onClick={() => fileRef.current?.click()}>นำเข้า xlsx</button>
          <input ref={fileRef} type="file" accept=".xlsx" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ''; }} />
          <button className="btn sm primary" onClick={() => setEdit({})}>+ เพิ่มร้าน</button>
        </div>
      </div>

      {isLoading ? <div className="empty">กำลังโหลด…</div> : (
        <table>
          <thead><tr><th>รหัส</th><th>ชื่อร้าน</th><th>ที่อยู่</th><th>เซลล์ผู้ดูแล</th><th className="r">จัดการ</th></tr></thead>
          <tbody>
            {data.map((s) => (
              <tr key={s.id}>
                <td>{s.code}</td><td>{s.name}</td><td>{s.location ?? '-'}</td>
                <td>{s.assignedUserName ?? <span className="muted">ยังไม่กำหนด</span>}</td>
                <td className="r">
                  <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn sm" onClick={() => setEdit(s)}>แก้ไข</button>
                    <button className="btn sm" onClick={() => { setNewUser(s.assignedUserId ?? ''); setTransfer(s); }}>โอนเซลล์</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {edit && (
        <Modal title={edit.id ? 'แก้ไขร้าน' : 'เพิ่มร้าน'} onClose={() => setEdit(null)}
          footer={<>
            <button className="btn" onClick={() => setEdit(null)}>ยกเลิก</button>
            <button className="btn primary" disabled={save.isPending || !edit.name} onClick={() => save.mutate(edit)}>บันทึก</button>
          </>}>
          <div className="field"><label>ชื่อร้าน</label><input className="input" value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
          <div className="field"><label>ที่อยู่</label><input className="input" value={edit.location ?? ''} onChange={(e) => setEdit({ ...edit, location: e.target.value })} /></div>
          <div className="field"><label>เซลล์ผู้ดูแล</label>
            <select className="input" value={edit.assignedUserId ?? ''} onChange={(e) => setEdit({ ...edit, assignedUserId: e.target.value })}>
              <option value="">— ไม่กำหนด —</option>
              {sales.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
          </div>
        </Modal>
      )}

      {transfer && (
        <Modal title={`โอนร้าน ${transfer.name}`} onClose={() => setTransfer(null)}
          footer={<>
            <button className="btn" onClick={() => setTransfer(null)}>ยกเลิก</button>
            <button className="btn primary" disabled={!newUser || doTransfer.isPending}
              onClick={() => doTransfer.mutate({ storeId: transfer.id, newUserId: newUser })}>โอน</button>
          </>}>
          <div className="field"><label>โอนให้เซลล์</label>
            <select className="input" value={newUser} onChange={(e) => setNewUser(e.target.value)}>
              <option value="">— เลือกเซลล์ —</option>
              {sales.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
          </div>
        </Modal>
      )}
    </div>
  );
}
