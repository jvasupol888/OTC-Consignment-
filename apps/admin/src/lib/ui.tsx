'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';

// ---------- Toast ----------
interface ToastCtx { show: (msg: string, kind?: 'ok' | 'err') => void }
const TCtx = createContext<ToastCtx>({ show: () => {} });
export const useToast = () => useContext(TCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ msg: string; kind: 'ok' | 'err' } | null>(null);
  const show = (msg: string, kind: 'ok' | 'err' = 'ok') => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3200);
  };
  return (
    <TCtx.Provider value={{ show }}>
      {children}
      {toast && <div className={`toast ${toast.kind === 'err' ? 'err' : ''}`}>{toast.msg}</div>}
    </TCtx.Provider>
  );
}

// ---------- Modal ----------
export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">{title}</div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
