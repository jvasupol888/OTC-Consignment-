'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiBlob, openFile } from '../../../lib/api';
import { useToast, Modal } from '../../../lib/ui';

interface Line { productCode: string; productName: string; quantity: number }
interface Doc {
  docNo: string;
  docType: string;
  returnSubtype: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  evidenceKey: string | null;
  remark: string | null;
  createdAt: string;
  createdBy: { name: string | null };
  store: { name: string } | null;
  lines: Line[];
}

const DOC_TYPE: Record<string, string> = {
  REQUEST: 'เบิกเข้าสต็อก', CONSIGN: 'ฝากขาย', SALE: 'ขายจริง', RETURN: 'คืนสินค้า',
};
const FILTERS = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'ALL'] as const;

export default function ApprovalsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('PENDING');
  const [remarkModal, setRemarkModal] = useState<{ docNo: string; action: 'reject' | 'cancel' } | null>(null);
  const [remark, setRemark] = useState('');

  const { data = [], isLoading } = useQuery({
    queryKey: ['transactions', filter],
    queryFn: () => api<Doc[]>(`/transactions${filter === 'ALL' ? '' : `?status=${filter}`}`),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['transactions'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const approve = useMutation({
    mutationFn: (docNo: string) => api(`/transactions/${docNo}/approve`, { method: 'POST' }),
    onSuccess: () => { toast.show('อนุมัติแล้ว'); refresh(); },
    onError: (e) => toast.show((e as Error).message, 'err'),
  });

  const withRemark = useMutation({
    mutationFn: ({ docNo, action, remark }: { docNo: string; action: string; remark: string }) =>
      api(`/transactions/${docNo}/${action}`, { method: 'POST', body: JSON.stringify({ remark }) }),
    onSuccess: () => {
      toast.show('ดำเนินการแล้ว'); setRemarkModal(null); setRemark(''); refresh();
    },
    onError: (e) => toast.show((e as Error).message, 'err'),
  });

  const viewSlip = async (docNo: string) => {
    try { openFile(await apiBlob(`/reports/transactions/${docNo}/slip.pdf`)); }
    catch (e) { toast.show((e as Error).message, 'err'); }
  };
  const viewEvidence = async (key: string) => {
    try { const { url } = await api<{ url: string }>(`/files/view?key=${encodeURIComponent(key)}`); window.open(url, '_blank'); }
    catch (e) { toast.show((e as Error).message, 'err'); }
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="btn-row">
          {FILTERS.map((f) => (
            <button key={f} className={`btn sm ${filter === f ? 'primary' : ''}`} onClick={() => setFilter(f)}>
              {f === 'ALL' ? 'ทั้งหมด' : f}
            </button>
          ))}
        </div>
        <button className="btn sm" onClick={refresh}>รีเฟรช</button>
      </div>

      {isLoading ? (
        <div className="empty">กำลังโหลด…</div>
      ) : data.length === 0 ? (
        <div className="empty">ไม่มีรายการ</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>เลขที่</th><th>ประเภท</th><th>เซลล์</th><th>ร้านยา</th>
              <th>รายการสินค้า</th><th>สถานะ</th><th className="r">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.docNo}>
                <td>
                  <b>{d.docNo}</b>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {new Date(d.createdAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </td>
                <td>
                  {DOC_TYPE[d.docType] ?? d.docType}
                  {d.returnSubtype && <div className="muted" style={{ fontSize: 12 }}>{d.returnSubtype}</div>}
                </td>
                <td>{d.createdBy.name ?? '-'}</td>
                <td>{d.store?.name ?? '-'}</td>
                <td>
                  {d.lines.map((l, i) => (
                    <div key={i} style={{ fontSize: 13 }}>
                      {l.productName} <b>×{l.quantity}</b>
                    </div>
                  ))}
                </td>
                <td><span className={`badge ${d.status}`}>{d.status}</span></td>
                <td className="r">
                  <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
                    {d.status === 'PENDING' && (
                      <>
                        <button className="btn sm green" disabled={approve.isPending}
                          onClick={() => approve.mutate(d.docNo)}>อนุมัติ</button>
                        <button className="btn sm red"
                          onClick={() => { setRemark(''); setRemarkModal({ docNo: d.docNo, action: 'reject' }); }}>ปฏิเสธ</button>
                      </>
                    )}
                    {d.status === 'APPROVED' && (
                      <button className="btn sm red"
                        onClick={() => { setRemark(''); setRemarkModal({ docNo: d.docNo, action: 'cancel' }); }}>ยกเลิก</button>
                    )}
                    {d.evidenceKey && (
                      <button className="btn sm" onClick={() => viewEvidence(d.evidenceKey!)}>สลิป</button>
                    )}
                    <button className="btn sm" onClick={() => viewSlip(d.docNo)}>PDF</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {remarkModal && (
        <Modal
          title={remarkModal.action === 'reject' ? 'ปฏิเสธรายการ' : 'ยกเลิกรายการ (rollback สต็อก)'}
          onClose={() => setRemarkModal(null)}
          footer={
            <>
              <button className="btn" onClick={() => setRemarkModal(null)}>ยกเลิก</button>
              <button className="btn red" disabled={withRemark.isPending || (remarkModal.action === 'reject' && !remark.trim())}
                onClick={() => withRemark.mutate({ ...remarkModal, remark })}>ยืนยัน</button>
            </>
          }
        >
          <div className="field">
            <label>เหตุผล / หมายเหตุ {remarkModal.action === 'reject' && '(จำเป็น)'}</label>
            <textarea className="input" rows={3} value={remark} onChange={(e) => setRemark(e.target.value)} />
          </div>
          <div className="muted" style={{ fontSize: 13 }}>
            {remarkModal.action === 'cancel' && 'การยกเลิกรายการที่อนุมัติแล้ว ระบบจะคืนสต็อกกลับอัตโนมัติ'}
          </div>
        </Modal>
      )}
    </div>
  );
}
