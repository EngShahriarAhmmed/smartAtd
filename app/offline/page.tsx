export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-4 text-5xl">📡</div>
        <h1 className="text-2xl font-bold text-slate-900">You are offline</h1>
        <p className="mt-2 text-sm text-slate-500">
          Reconnect to use live attendance scanning, login, uploads, sync and dashboards.
        </p>
      </div>
    </main>
  );
}
