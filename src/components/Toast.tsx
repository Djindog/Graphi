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
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', flexDirection: 'column', gap: 8, zIndex: 9999, pointerEvents: 'none',
    }}>
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
    }, 2600);
    return () => clearTimeout(t);
  }, [toast.id, onRemove]);

  const isError = toast.type === 'error';

  return (
    <div style={{
      padding: '9px 16px', borderRadius: 10, fontSize: 14, fontWeight: 500,
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      background: isError ? '#EF4444' : '#111827',
      color: '#fff',
      display: 'flex', alignItems: 'center', gap: 8,
      transition: 'opacity 0.3s, transform 0.3s',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(8px)',
      pointerEvents: 'auto',
      whiteSpace: 'nowrap',
      animation: visible ? 'gtoast 0.3s ease' : undefined,
    }}>
      <span style={{ fontSize: 12, flexShrink: 0 }}>{isError ? '✕' : '✓'}</span>
      {toast.text}
    </div>
  );
}
