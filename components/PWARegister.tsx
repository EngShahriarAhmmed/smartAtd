'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, X } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const DISMISSED_UNTIL_KEY = 'smart-qr-pwa-install-dismissed-until';
const INSTALLED_KEY = 'smart-qr-pwa-installed';
const DISMISS_DAYS = 14;

function isRunningAsInstalledApp() {
  if (typeof window === 'undefined') return false;

  const nav = window.navigator as Navigator & { standalone?: boolean };

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    nav.standalone === true ||
    document.referrer.startsWith('android-app://')
  );
}

function hasActiveDismissal() {
  if (typeof window === 'undefined') return true;

  const dismissedUntil = Number(window.localStorage.getItem(DISMISSED_UNTIL_KEY) || '0');
  return dismissedUntil > Date.now();
}

function dismissForDays(days = DISMISS_DAYS) {
  if (typeof window === 'undefined') return;

  const until = Date.now() + days * 24 * 60 * 60 * 1000;
  window.localStorage.setItem(DISMISSED_UNTIL_KEY, String(until));
}

export default function PWARegister() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [installed, setInstalled] = useState(false);

  const canInstall = useMemo(() => !installed && !!installPrompt, [installed, installPrompt]);

  useEffect(() => {
    let mounted = true;

    async function registerServiceWorker() {
      if (!('serviceWorker' in navigator)) return;

      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    }

    function refreshInstalledState() {
      const alreadyInstalled =
        isRunningAsInstalledApp() || window.localStorage.getItem(INSTALLED_KEY) === '1';

      if (!mounted) return;

      setInstalled(alreadyInstalled);

      if (alreadyInstalled) {
        setShowInstall(false);
        setInstallPrompt(null);
      }
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();

      if (isRunningAsInstalledApp() || window.localStorage.getItem(INSTALLED_KEY) === '1') {
        setShowInstall(false);
        return;
      }

      if (hasActiveDismissal()) {
        return;
      }

      setInstallPrompt(event as BeforeInstallPromptEvent);
      setShowInstall(true);
    }

    function handleAppInstalled() {
      window.localStorage.setItem(INSTALLED_KEY, '1');
      window.localStorage.removeItem(DISMISSED_UNTIL_KEY);
      setInstalled(true);
      setShowInstall(false);
      setInstallPrompt(null);
    }

    registerServiceWorker();
    refreshInstalledState();

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    standaloneQuery.addEventListener?.('change', refreshInstalledState);

    return () => {
      mounted = false;
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      standaloneQuery.removeEventListener?.('change', refreshInstalledState);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    setInstallPrompt(null);

    if (choice.outcome === 'accepted') {
      window.localStorage.setItem(INSTALLED_KEY, '1');
      window.localStorage.removeItem(DISMISSED_UNTIL_KEY);
      setInstalled(true);
      setShowInstall(false);
      return;
    }

    dismissForDays(7);
    setShowInstall(false);
  }

  function closeInstallPrompt() {
    dismissForDays();
    setShowInstall(false);
  }

  if (!showInstall || !canInstall) return null;

  return (
    <div className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-slate-900 p-2 text-white">
          <Download size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">Install Smart QR Attendance</p>
          <p className="mt-1 text-xs text-slate-500">
            Add this app to your device for faster attendance access.
          </p>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={installApp}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              Install App
            </button>
            <button
              type="button"
              onClick={closeInstallPrompt}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Later
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={closeInstallPrompt}
          className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close install prompt"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
