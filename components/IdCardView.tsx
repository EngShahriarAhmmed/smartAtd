'use client';

import { Download, Printer, QrCode } from 'lucide-react';

const CARD_SIZE = {
  normal: 'h-[520px] w-[330px]',
  compact: 'h-[347px] w-[220px]',
};

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
  const institutionName = institution?.name || 'YOUR SCHOOL NAME';
  const institutionAddress = institution?.address || 'School Address, City';
  const institutionPhone = student.guardianPhone || '002-000-000';

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

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${student.name} ID Card</title>
          <base href="${window.location.origin}" />
          ${styles}
          <style>
            body {
              margin: 0;
              padding: 10mm;
              font-family: Arial, sans-serif;
              background: white;
            }

            .print-wrap {
              display: flex;
              gap: 8mm;
              justify-content: center;
              align-items: flex-start;
              flex-wrap: wrap;
            }

            .id-card-print-size {
              width: 54mm !important;
              height: 85.6mm !important;
              box-shadow: none !important;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .id-card-print-size > div {
              width: 330px !important;
              height: 520px !important;
              transform: scale(0.513) !important;
              transform-origin: top left !important;
            }

            .no-print {
              display: none !important;
            }

            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }

              @page {
                size: A4;
                margin: 10mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-wrap">${printable.innerHTML}</div>
          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  return (
    <div className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
      <div
        id={`id-card-${student.studentId}`}
        className="flex flex-wrap justify-center gap-4"
      >
        <FrontCard
          student={student}
          institutionName={institutionName}
          logo={institution?.logo}
          compact={compact}
        />

        <BackCard
          student={student}
          institutionName={institutionName}
          institutionAddress={institutionAddress}
          institutionPhone={institutionPhone}
          qrDataUrl={qrDataUrl}
          compact={compact}
        />
      </div>

      <div className="no-print mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={printCard}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          <Printer size={16} />
          Print ID Card
        </button>

        <button
          type="button"
          onClick={downloadQR}
          disabled={!qrDataUrl}
          className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 shadow-sm transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={16} />
          Download QR
        </button>
      </div>
    </div>
  );
}

function FrontCard({
  student,
  institutionName,
  logo,
  compact = false,
}: {
  student: IdCardStudent;
  institutionName: string;
  logo?: string | null;
  compact?: boolean;
}) {
  const scaleClass = compact ? 'scale-[0.67] origin-top-left' : '';

  return (
    <div
      className={`id-card-print-size relative overflow-hidden rounded-sm bg-white shadow-2xl shadow-slate-400/40 ${
        compact ? CARD_SIZE.compact : CARD_SIZE.normal
      }`}
    >
      <div className={`absolute left-0 top-0 h-[520px] w-[330px] ${scaleClass}`}>
        <TopDesign />
        <BottomDesign />

        <div className="relative z-10 flex h-full flex-col px-3 pb-4 pt-14">
          <div className="text-center">
            {logo ? (
              <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-white shadow-md">
                <img src={logo} alt="Institution logo" className="h-full w-full object-cover" />
              </div>
            ) : null}

            <h2 className="mx-auto max-w-[300px] text-[19px] font-black uppercase leading-[1.05] tracking-tight text-[#55c8b6]">
              {institutionName}
            </h2>
          </div>

          <div className="mt-4 flex justify-center">
            <div className="flex h-[126px] w-[126px] items-center justify-center bg-[#f3a899] p-2 shadow-sm">
              <div className="flex h-full w-full items-center justify-center overflow-hidden bg-slate-100 text-5xl font-black text-[#55c8b6]">
                {student.photo ? (
                  <img src={student.photo} alt={student.name} className="h-full w-full object-cover" />
                ) : (
                  student.name.slice(0, 1).toUpperCase()
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 text-center">
            <h3 className="truncate text-[23px] font-black leading-tight text-[#55c8b6]">
              {student.name}
            </h3>
          </div>

          <div className="mt-2 space-y-1.5 text-[11px] text-[#444]">
            <InfoRow label="Student ID" value={student.studentId} />
            <InfoRow label="Father's Name" value={student.guardianName || 'N/A'} />
            <InfoRow label="Class Name" value={`${student.class} ${student.section}`} />
            <InfoRow label="Class Roll" value={student.rollNumber} />
          </div>

          <div className="flex justify-end pt-1">
            <div className="w-[150px] text-center">
              <div className="border-b border-[#555] pb-1" />
              <div className="mt-1 text-[10px] font-black uppercase tracking-wide text-[#555]">
                Institute Head Signature
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BackCard({
  student,
  institutionName,
  institutionAddress,
  institutionPhone,
  qrDataUrl,
  compact = false,
}: {
  student: IdCardStudent;
  institutionName: string;
  institutionAddress: string;
  institutionPhone: string;
  qrDataUrl?: string;
  compact?: boolean;
}) {
  const scaleClass = compact ? 'scale-[0.67] origin-top-left' : '';

  return (
    <div
      className={`id-card-print-size relative overflow-hidden rounded-sm bg-white shadow-2xl shadow-slate-400/40 ${
        compact ? CARD_SIZE.compact : CARD_SIZE.normal
      }`}
    >
      <div className={`absolute left-0 top-0 h-[520px] w-[330px] ${scaleClass}`}>
        <TopDesign />
        <BottomDesign />

        <div className="relative z-10 flex h-full flex-col px-8 pb-8 pt-16">
          <div className="flex justify-center">
            <div className="flex h-[150px] w-[150px] items-center justify-center bg-white p-2">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt={`${student.name} QR`} className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full w-full items-center justify-center border-4 border-[#55c8b6] text-[#55c8b6]">
                  <QrCode size={80} />
                </div>
              )}
            </div>
          </div>

          <div className="mt-7 text-center text-[13px] font-semibold leading-5 text-[#555]">
            For More Information
            <br />
            Please Scan This
          </div>

          <div className="mt-8 text-[11px] leading-5 text-[#555]">
            <p className="font-semibold">If this card is found, Please, inform :</p>

            <p className="mt-2 font-black text-[#444]">{institutionName}</p>

            <p className="mt-1">{institutionAddress}</p>
          </div>

          <div className="mt-4 text-[16px] font-black tracking-wide text-[#55c8b6]">
            {institutionPhone}
          </div>

          <div className="mt-auto pt-3 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-[#ef6a55]">
            Return to Institution Authority
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[95px_10px_1fr] items-center">
      <div className="font-semibold">{label}</div>
      <div className="font-bold">:</div>
      <div className="truncate font-semibold">{value || 'N/A'}</div>
    </div>
  );
}

function TopDesign() {
  return (
    <>
      <div className="absolute left-0 top-0 h-[95px] w-full bg-[#55c8b6]" />

      <svg
        className="absolute left-0 top-[38px] h-[125px] w-full"
        viewBox="0 0 330 125"
        preserveAspectRatio="none"
      >
        <path
          d="M0 44 C50 6 88 0 132 25 C184 55 237 62 330 20 L330 125 L0 125 Z"
          fill="white"
        />
        <path
          d="M0 34 C61 -5 91 -6 137 21 C188 52 237 52 330 15"
          fill="none"
          stroke="#ef6a55"
          strokeWidth="8"
        />
        <path
          d="M0 51 C58 6 98 5 141 32 C190 62 244 67 330 29"
          fill="none"
          stroke="#f5c1cf"
          strokeWidth="9"
          opacity="0.9"
        />
      </svg>
    </>
  );
}

function BottomDesign() {
  return (
    <>
      <svg
        className="absolute bottom-0 left-0 h-[96px] w-full"
        viewBox="0 0 330 96"
        preserveAspectRatio="none"
      >
        <path
          d="M0 36 C68 70 135 61 197 47 C250 34 292 42 330 61 L330 96 L0 96 Z"
          fill="#fff5ec"
        />
        <path
          d="M0 51 C78 85 139 76 205 59 C259 45 294 54 330 72"
          fill="none"
          stroke="#f7d8c8"
          strokeWidth="7"
        />
        <path
          d="M0 74 C72 88 132 82 191 71 C241 62 287 67 330 82"
          fill="none"
          stroke="#ef6a55"
          strokeWidth="10"
        />
      </svg>
    </>
  );
}

