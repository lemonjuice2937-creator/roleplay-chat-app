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
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-3 w-full max-w-xs px-4 pointer-events-none">
      {items.map((toast) => (
        <div
          key={toast.id}
          onClick={() => dismiss(toast.id)}
          className="pointer-events-auto rounded-2xl px-4 py-3 cursor-pointer animate-slide-down bg-navy-700/95 backdrop-blur-sm border border-neon/50 shadow-[0_0_24px_rgba(13,92,168,0.45)] animate-glow-pulse"
        >
          <div className="flex items-center gap-2.5">
            <div className="bg-neon/25 rounded-full p-1.5 shrink-0">
              <MessageSquare size={14} className="text-neon-light" />
            </div>
            <p className="text-white font-bold text-sm truncate">{toast.title}</p>
          </div>
          <p className="text-white/50 text-xs mt-1.5 pl-[38px] line-clamp-2">
            {toast.body}
          </p>
        </div>
      ))}
    </div>
  );
}
