'use client';

import { Download, Printer, QrCode } from 'lucide-react';

export type IdCardStudent = {
  _id?: string;
  id?: string;
  studentId: string;
  rollNumber: string;
  name: string;
  class: string;
  section: string;
  photo?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
};

export type IdCardInstitution = {
  name?: string | null;
  code?: string | null;
  address?: string | null;
  logo?: string | null;
};

export default function IdCardView({
  student,
  institution,
  qrDataUrl,
  compact = false,
}: {
  student: IdCardStudent;
  institution?: IdCardInstitution | null;
  qrDataUrl?: string;
  compact?: boolean;
}) {
  const institutionName = institution?.name || 'Smart QR Attendance';
  const institutionAddress = institution?.address || 'Educational Institution';

  function safeFileName(value: string) {
    return value
      .trim()
      .replace(/[^\w\s.-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }

  function downloadQR() {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${safeFileName(student.studentId)}-${safeFileName(student.name)}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function printCard() {
    const printable = document.getElementById(`id-card-${student.studentId}`);
    if (!printable) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${student.name} ID Card</title>
          <style>
            body { margin: 0; padding: 24px; font-family: Arial, sans-serif; background: #f8fafc; }
            .print-wrap { display: flex; gap: 24px; flex-wrap: wrap; justify-content: center; }
            @media print { body { background: white; } @page { size: A4; margin: 12mm; } }
          </style>
        </head>
        <body>
          <div class="print-wrap">${printable.innerHTML}</div>
          <script>window.onload = function(){ window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div id={`id-card-${student.studentId}`} className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-700 via-blue-600 to-emerald-500 p-5 text-white shadow-lg shadow-blue-700/10">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-white/10" />

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white/95 text-blue-700 shadow-sm">
                {institution?.logo ? (
                  <img src={institution.logo} alt="Institution logo" className="h-full w-full object-cover" />
                ) : (
                  <QrCode size={26} />
                )}
              </div>
              <div>
                <div className="text-sm font-black leading-tight">{institutionName}</div>
                <div className="mt-0.5 text-[11px] font-semibold text-blue-100">Student Identity Card</div>
              </div>
            </div>
            <div className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white">
              Active
            </div>
          </div>

          <div className="relative mt-7 flex items-center gap-4">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-4 border-white/40 bg-white text-3xl font-black text-blue-700 shadow-md">
              {student.photo ? (
                <img src={student.photo} alt={student.name} className="h-full w-full object-cover" />
              ) : (
                student.name.slice(0, 1).toUpperCase()
              )}
            </div>

            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-100">Student</div>
              <h3 className="mt-1 truncate text-2xl font-black leading-tight">{student.name}</h3>
              <div className="mt-2 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white">
                ID: {student.studentId}
              </div>
            </div>
          </div>

          <div className="relative mt-6 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/15 p-3">
              <div className="text-[10px] font-bold uppercase text-blue-100">Class</div>
              <div className="mt-1 text-lg font-black">{student.class}</div>
            </div>
            <div className="rounded-2xl bg-white/15 p-3">
              <div className="text-[10px] font-bold uppercase text-blue-100">Section</div>
              <div className="mt-1 text-lg font-black">{student.section}</div>
            </div>
            <div className="rounded-2xl bg-white/15 p-3">
              <div className="text-[10px] font-bold uppercase text-blue-100">Roll</div>
              <div className="mt-1 text-lg font-black">{student.rollNumber}</div>
            </div>
          </div>

          <div className="relative mt-5 rounded-2xl bg-white/10 p-3 text-[11px] font-medium leading-5 text-blue-50">
            Guardian: {student.guardianName || 'N/A'} {student.guardianPhone ? `• ${student.guardianPhone}` : ''}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60">
          <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-blue-600 to-emerald-500" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Back Side</div>
              <h3 className="mt-1 text-lg font-black text-slate-900">Scan for Attendance</h3>
              <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
                This QR contains only an encrypted token. It does not expose student personal information.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700">
              {student.class}-{student.section}
            </div>
          </div>

          <div className="mt-5 flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 p-4">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`${student.name} QR`} className={`${compact ? 'h-40 w-40' : 'h-52 w-52'} rounded-2xl bg-white p-2 shadow-sm`} />
            ) : (
              <div className="flex h-52 w-52 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-400 shadow-sm">
                QR not generated
              </div>
            )}
            <div className="mt-3 text-center text-xs font-bold text-slate-500">{student.studentId} • Roll {student.rollNumber}</div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500">
            <div className="font-bold text-slate-700">Instructions</div>
            <div>1. Keep this card with you during class.</div>
            <div>2. Only authorized teachers may scan this QR.</div>
            <div>3. Return lost card to {institutionName}.</div>
            <div className="mt-1 font-semibold text-slate-600">{institutionAddress}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={printCard}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          <Printer size={16} />
          Print ID Card
        </button>
        <button
          type="button"
          onClick={downloadQR}
          disabled={!qrDataUrl}
          className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={16} />
          Download QR
        </button>
      </div>
    </div>
  );
}
