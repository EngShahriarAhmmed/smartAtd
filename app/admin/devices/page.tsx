'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Loader2, MonitorSmartphone, RefreshCw, ShieldCheck } from 'lucide-react';

type Device = {
  _id: string;
  deviceName: string;
  deviceId: string;
  role?: string;
  status: string;
  lastUsedAt?: string;
  notes?: string;
};

export default function DevicesPage() {
  const [items, setItems] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({ deviceName: '', deviceId: '', status: 'pending', notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/devices?limit=200', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load devices');
      setItems(data.devices || []);
    } catch (error) {
      setItems([]);
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'Unable to load devices.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save device');
      setMessage({ ok: true, text: 'Device saved successfully.' });
      setForm({ deviceName: '', deviceId: '', status: 'pending', notes: '' });
      await load();
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'Unable to save device.' });
      setLoading(false);
    }
  }

  async function update(id: string, status: string) {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/devices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update device');
      setMessage({ ok: true, text: `Device ${status === 'active' ? 'approved' : status}.` });
      await load();
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'Unable to update device.' });
      setLoading(false);
    }
  }

  async function revoke(id: string) {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/devices?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke device');
      setMessage({ ok: true, text: 'Device revoked successfully.' });
      await load();
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'Unable to revoke device.' });
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 flex items-center gap-2 text-2xl font-black text-slate-900"><MonitorSmartphone size={26} />Device Binding</h1>
          <p className="mt-1 text-sm text-slate-500">
            Scanner devices are auto-created as pending when first used. Only approved devices can scan attendance.
          </p>
        </div>
        <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
        New mobile phones, laptops, tablets or scanners will appear here as <b>Pending</b> after they try to scan a QR code. Approve the device to allow actions, or block/revoke it to restrict access.
      </div>

      <form onSubmit={save} className="card mb-4 grid grid-cols-1 gap-3 p-4 md:grid-cols-5">
        <input className="input" value={form.deviceName} onChange={(e) => setForm({ ...form, deviceName: e.target.value })} placeholder="Device name" required />
        <input className="input md:col-span-2" value={form.deviceId} onChange={(e) => setForm({ ...form, deviceId: e.target.value })} placeholder="Device ID / fingerprint" required />
        <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="pending">Pending</option>
          <option value="active">Active / Approved</option>
          <option value="blocked">Blocked</option>
        </select>
        <button disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
          Save Device
        </button>
        <input className="input md:col-span-5" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" />
      </form>

      {message && <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-bold ${message.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{message.text}</div>}

      <div className="card overflow-hidden">
        <div className="border-b bg-slate-50 px-5 py-4 font-black">Bound Devices</div>
        {loading ? (
          <div className="p-10"><Loader2 className="animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-slate-500">No scanner device found. Use the scanner once from a mobile or laptop to auto-register a pending device.</div>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr><th>Device</th><th>ID</th><th>Role</th><th>Status</th><th>Last Used</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {items.map((device) => (
                  <tr key={device._id}>
                    <td><b>{device.deviceName}</b><div className="text-xs text-slate-500">{device.notes}</div></td>
                    <td className="max-w-xs truncate">{device.deviceId}</td>
                    <td>{device.role || '—'}</td>
                    <td><span className={`badge ${device.status === 'active' ? 'badge-success' : device.status === 'blocked' || device.status === 'revoked' ? 'badge-danger' : 'badge-warning'}`}>{device.status}</span></td>
                    <td>{device.lastUsedAt ? new Date(device.lastUsedAt).toLocaleString() : '—'}</td>
                    <td className="space-x-2 whitespace-nowrap">
                      <button type="button" disabled={device.status === 'active'} onClick={() => update(device._id, 'active')} className="rounded-lg border px-3 py-1 text-xs font-bold disabled:opacity-50">Approve</button>
                      <button type="button" disabled={device.status === 'blocked'} onClick={() => update(device._id, 'blocked')} className="rounded-lg border px-3 py-1 text-xs font-bold text-red-700 disabled:opacity-50">Block</button>
                      <button type="button" disabled={device.status === 'revoked'} onClick={() => revoke(device._id)} className="rounded-lg border px-3 py-1 text-xs font-bold text-red-700 disabled:opacity-50">Revoke</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
