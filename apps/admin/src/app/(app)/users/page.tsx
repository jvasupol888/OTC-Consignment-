'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useToast, Modal } from '../../../lib/ui';

interface User {
  id: string; code: string; username: string; fullName: string;
  role: 'SYSTEM_ADMIN' | 'ADMIN' | 'SALE'; status: 'ACTIVE' | 'INACTIVE';
}
type Form = Partial<User> & { password?: string };

export default function UsersPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [edit, setEdit] = useState<Form | null>(null);

  const { data = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: () => api<User[]>('/users') });
  const refresh = () => qc.invalidateQueries({ queryKey: ['users'] });

  const save = useMutation({
    mutationFn: (f: Form) => api('/users', {
      method: 'POST',
      body: JSON.stringify({
        id: f.id, username: f.username, fullName: f.fullName, role: f.role ?? 'SALE',
        status: f.status ?? 'ACTIVE', ...(f.password ? { password: f.password } : {}),
      }),
    }),
    onSuccess: () => { toast.show('บันทึกแล้ว'); setEdit(null); refresh(); },
    onError: (e) => toast.show((e as Error).message, 'err'),
  });

  const toggle = useMutation({
    mutationFn: (u: User) => api(`/users/${u.id}/status`, {
      method: 'PATCH', body: JSON.stringify({ status: u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
    }),
    onSuccess: () => refresh(),
    onError: (e) => toast.show((e as Error).message, 'err'),
  });

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>ผู้ใช้งาน ({data.length})</h2>
        <button className="btn sm primary" onClick={() => setEdit({ role: 'SALE', status: 'ACTIVE' })}>+ เพิ่มผู้ใช้</button>
      </div>

      {isLoading ? <div className="empty">กำลังโหลด…</div> : (
        <table>
          <thead><tr><th>รหัส</th><th>Username</th><th>ชื่อ-นามสกุล</th><th>บทบาท</th><th>สถานะ</th><th className="r">จัดการ</th></tr></thead>
          <tbody>
            {data.map((u) => (
              <tr key={u.id}>
                <td>{u.code}</td><td>{u.username}</td><td>{u.fullName}</td><td>{u.role}</td>
                <td><span className={`badge ${u.status}`}>{u.status}</span></td>
                <td className="r">
                  <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn sm" onClick={() => setEdit({ ...u, password: '' })}>แก้ไข</button>
                    <button className="btn sm" onClick={() => toggle.mutate(u)}>{u.status === 'ACTIVE' ? 'ระงับ' : 'เปิด'}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {edit && (
        <Modal title={edit.id ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้'} onClose={() => setEdit(null)}
          footer={<>
            <button className="btn" onClick={() => setEdit(null)}>ยกเลิก</button>
            <button className="btn primary"
              disabled={save.isPending || !edit.username || !edit.fullName || (!edit.id && !edit.password)}
              onClick={() => save.mutate(edit)}>บันทึก</button>
          </>}>
          <div className="field"><label>Username</label><input className="input" value={edit.username ?? ''} onChange={(e) => setEdit({ ...edit, username: e.target.value })} /></div>
          <div className="field"><label>ชื่อ-นามสกุล</label><input className="input" value={edit.fullName ?? ''} onChange={(e) => setEdit({ ...edit, fullName: e.target.value })} /></div>
          <div className="field"><label>รหัสผ่าน {edit.id && <span className="muted">(เว้นว่างถ้าไม่เปลี่ยน)</span>}</label>
            <input className="input" type="password" value={edit.password ?? ''} onChange={(e) => setEdit({ ...edit, password: e.target.value })} /></div>
          <div className="field"><label>บทบาท</label>
            <select className="input" value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value as User['role'] })}>
              <option value="SALE">SALE</option><option value="ADMIN">ADMIN</option><option value="SYSTEM_ADMIN">SYSTEM_ADMIN</option>
            </select>
          </div>
          <div className="field"><label>สถานะ</label>
            <select className="input" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as User['status'] })}>
              <option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
        </Modal>
      )}
    </div>
  );
}
