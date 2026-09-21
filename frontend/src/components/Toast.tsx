import React from 'react';
import { CheckCircle2, X, XCircle } from 'lucide-react';

type ToastType = 'success' | 'error';
type ToastItem = { id: number; type: ToastType; message: string };

// Lightweight pub/sub, same pattern as the unauthorized-handler in api.ts -
// no context/provider needed since ToastHost is mounted once at the app
// root and every page can call showToast() directly.
let toasts: ToastItem[] = [];
let listeners: Array<(items: ToastItem[]) => void> = [];
let nextId = 1;

function notify() {
  listeners.forEach(listener => listener(toasts));
}

export function showToast(message: string, type: ToastType = 'success') {
  const id = nextId++;
  toasts = [...toasts, { id, type, message }];
  notify();
  setTimeout(() => dismissToast(id), 4000);
}

export function dismissToast(id: number) {
  toasts = toasts.filter(t => t.id !== id);
  notify();
}

export default function ToastHost() {
  const [items, setItems] = React.useState<ToastItem[]>(toasts);

  React.useEffect(() => {
    listeners.push(setItems);
    return () => {
      listeners = listeners.filter(l => l !== setItems);
    };
  }, []);

  if (!items.length) return null;

  return (
    <div className="toast-host" role="status" aria-live="polite">
      {items.map(t => (
        <div className={`toast toast-${t.type}`} key={t.id}>
          {t.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          <span>{t.message}</span>
          <button className="toast-close" onClick={() => dismissToast(t.id)} aria-label="Dismiss notification">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
