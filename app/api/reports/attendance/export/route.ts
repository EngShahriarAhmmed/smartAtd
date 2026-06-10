import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { requireAuth, ROLE_GROUPS } from '@/lib/rbac';
import { getDailyPeriodWiseReport, getMonthlyAttendanceReport, toCsv } from '@/lib/advanced-reports';

function sanitize(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  return new NextResponse(toCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}.csv"`,
    },
  });
}

function exportExcel(filename: string, rows: Record<string, unknown>[]) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
    },
  });
}

function exportPrintablePdf(filename: string, title: string, rows: Record<string, unknown>[]) {
  const headers = rows.length ? Object.keys(rows[0]) : ['Message'];
  const safeRows = rows.length ? rows : [{ Message: 'No data found' }];
  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${title}</title><style>body{font-family:Arial,sans-serif;margin:24px;color:#111827}h1{font-size:20px;margin:0 0 12px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #d1d5db;padding:6px;text-align:left}th{background:#f3f4f6}@media print{@page{size:A4 landscape;margin:10mm}}</style></head><body><h1>${title}</h1><table><thead><tr>${headers.map((h)=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${safeRows.map((row)=>`<tr>${headers.map((h)=>`<td>${String(row[h] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table><script>window.onload=function(){window.print()}</script></body></html>`;
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="${filename}.html"`,
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.staff);
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get('report') || 'daily';
    const formatType = searchParams.get('format') || searchParams.get('type') || 'xlsx';
    const today = format(new Date(), 'yyyy-MM-dd');
    const month = searchParams.get('month') || format(new Date(), 'yyyy-MM');

    let rows: Record<string, unknown>[] = [];
    let title = 'Attendance Report';

    if (reportType === 'monthly') {
      const report = await getMonthlyAttendanceReport(auth, {
        month,
        class: searchParams.get('class') || undefined,
        section: searchParams.get('section') || undefined,
        subject: searchParams.get('subject') || undefined,
        period: searchParams.get('period') || undefined,
        threshold: Number(searchParams.get('threshold') || 75),
      });
      rows = report.rows;
      title = `Monthly Attendance Report - ${month}`;
    } else if (reportType === 'non-collegiate') {
      const report = await getMonthlyAttendanceReport(auth, {
        month,
        class: searchParams.get('class') || undefined,
        section: searchParams.get('section') || undefined,
        subject: searchParams.get('subject') || undefined,
        period: searchParams.get('period') || undefined,
        threshold: Number(searchParams.get('threshold') || 75),
      });
      rows = report.rows.filter((row) => row.nonCollegiate);
      title = `Non-Collegiate List - ${month}`;
    } else {
      const date = searchParams.get('date') || today;
      const report = await getDailyPeriodWiseReport(auth, {
        date,
        class: searchParams.get('class') || undefined,
        section: searchParams.get('section') || undefined,
        subject: searchParams.get('subject') || undefined,
        period: searchParams.get('period') || undefined,
      });
      rows = report.rows;
      title = `Daily Period-wise Attendance - ${date}`;
    }

    const filename = sanitize(`${title}-${Date.now()}`);

    if (formatType === 'csv') return exportCsv(filename, rows);
    if (formatType === 'pdf') return exportPrintablePdf(filename, title, rows);
    return exportExcel(filename, rows);
  } catch (error) {
    console.error('Attendance export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
