import { useEffect, useState } from 'react';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error';
}

interface Props {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: Props) {
  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', gap: 8, zIndex: 9999, pointerEvents: 'none' }}>
      {toasts.map(t => <Toast key={t.id} toast={t} onRemove={onRemove} />)}
    </div>
  );
}

function Toast({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, 2500);
    return () => clearTimeout(t);
  }, [toast.id, onRemove]);

  return (
    <div
      style={{
        padding: '9px 16px', borderRadius: 10, fontSize: 14, fontWeight: 500,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        background: toast.type === 'success' ? '#111827' : '#EF4444',
        color: '#fff',
        transition: 'opacity 0.3s, transform 0.3s',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        pointerEvents: 'auto',
        whiteSpace: 'nowrap',
      }}
    >
      {toast.text}
    </div>
  );
}
