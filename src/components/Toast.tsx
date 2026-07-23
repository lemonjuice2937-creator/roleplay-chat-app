import { useState, useEffect, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';

interface ToastData {
  id: number;
  title: string;
  body: string;
}

let toastId = 0;
let listeners: Array<(toasts: ToastData[]) => void> = [];
let toasts: ToastData[] = [];

function notifyListeners() {
  listeners.forEach((l) => l([...toasts]));
}

export function showToast(title: string, body: string) {
  const id = ++toastId;
  toasts = [...toasts, { id, title, body }];
  notifyListeners();

  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notifyListeners();
  }, 4000);
}

export default function Toast() {
  const [items, setItems] = useState<ToastData[]>([]);

  useEffect(() => {
    listeners.push(setItems);
    return () => {
      listeners = listeners.filter((l) => l !== setItems);
    };
  }, []);

  const dismiss = useCallback((id: number) => {
    toasts = toasts.filter((t) => t.id !== id);
    notifyListeners();
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
      {items.map((toast) => (
        <div
          key={toast.id}
          onClick={() => dismiss(toast.id)}
          className="pointer-events-auto bg-navy-700 border border-neon/30 rounded-xl px-4 py-3 shadow-lg shadow-neon/10 flex items-start gap-3 cursor-pointer animate-slide-down"
        >
          <div className="mt-0.5 bg-neon/20 rounded-full p-1.5 shrink-0">
            <MessageSquare size={16} className="text-neon" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white font-semibold text-sm truncate">{toast.title}</p>
            <p className="text-gray-300 text-xs mt-0.5 line-clamp-2">{toast.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
