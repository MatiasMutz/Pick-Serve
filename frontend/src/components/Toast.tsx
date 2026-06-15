import { useState, useCallback } from 'react';

interface ToastItem { id: number; msg: string; type: 'success' | 'error'; }

let _show: ((msg: string, type?: 'success' | 'error') => void) | null = null;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);

  _show = show;
  return { toasts, show };
}

export function toast(msg: string, type: 'success' | 'error' = 'success') {
  _show?.(msg, type);
}

export function ToastContainer({ toasts }: { toasts: { id: number; msg: string; type: string }[] }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>
      ))}
    </div>
  );
}
