'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

type Toast = {
  id: number;
  type: ToastType;
  message: string;
  details?: string;
};

type ToastContextValue = {
  toast: (type: ToastType, message: string, details?: string) => void;
  success: (message: string, details?: string) => void;
  error: (message: string, details?: string) => void;
  info: (message: string, details?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const config = {
  success: {
    icon: CheckCircle2,
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    iconColor: 'text-emerald-600',
    title: 'Success',
  },
  error: {
    icon: XCircle,
    border: 'border-red-200',
    bg: 'bg-red-50',
    text: 'text-red-800',
    iconColor: 'text-red-600',
    title: 'Error',
  },
  info: {
    icon: Info,
    border: 'border-blue-200',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    iconColor: 'text-blue-600',
    title: 'Information',
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((type: ToastType, message: string, details?: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setItems((prev) => [...prev.slice(-3), { id, type, message, details }]);
    window.setTimeout(() => remove(id), 5000);
  }, [remove]);

  const value = useMemo<ToastContextValue>(() => ({
    toast,
    success: (message, details) => toast('success', message, details),
    error: (message, details) => toast('error', message, details),
    info: (message, details) => toast('info', message, details),
  }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-5 top-5 z-[9999] flex w-[calc(100%-2rem)] max-w-md flex-col gap-3">
        {items.map((item) => {
          const selected = config[item.type];
          const Icon = selected.icon;
          return (
            <div key={item.id} className={`animate-[slideIn_0.25s_ease-out] rounded-2xl border ${selected.border} ${selected.bg} p-4 shadow-2xl backdrop-blur`}>
              <div className="flex gap-3">
                <div className={`mt-0.5 ${selected.iconColor}`}><Icon size={22} /></div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-bold ${selected.text}`}>{selected.title}</p>
                  <p className={`mt-0.5 text-sm ${selected.text}`}>{item.message}</p>
                  {item.details && <p className="mt-1 max-h-16 overflow-hidden text-xs text-slate-500">{item.details}</p>}
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/70">
                    <div className="h-full animate-[toastTimer_5s_linear_forwards] rounded-full bg-current opacity-40" />
                  </div>
                </div>
                <button type="button" onClick={() => remove(item.id)} className="rounded-full p-1 text-slate-400 transition hover:bg-white hover:text-slate-700" aria-label="Close notification">
                  <X size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toast: () => undefined,
      success: () => undefined,
      error: () => undefined,
      info: () => undefined,
    } as ToastContextValue;
  }
  return ctx;
}
