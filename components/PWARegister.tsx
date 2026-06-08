'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export default function PWARegister() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((error) => {
          console.error('Service worker registration failed:', error);
        });
      });
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setShowInstall(false);
      setInstallPrompt(null);
    }
  }

  if (!showInstall || !installPrompt) return null;

  return (
    <div className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-slate-900 p-2 text-white"><Download size={18} /></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">Install Smart QR Attendance</p>
          <p className="mt-1 text-xs text-slate-500">Add this app to your device for faster attendance access.</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={installApp} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800">Install App</button>
            <button type="button" onClick={() => setShowInstall(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">Later</button>
          </div>
        </div>
        <button type="button" onClick={() => setShowInstall(false)} className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close install prompt"><X size={16} /></button>
      </div>
    </div>
  );
}
