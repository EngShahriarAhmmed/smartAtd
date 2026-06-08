import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import prisma from '@/lib/prisma';
import { requireAuth, ROLE_GROUPS } from '@/lib/rbac';
import { tenantWhere } from '@/lib/prisma-utils';

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const text = String(value ?? '');
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  return [headers.join(','), ...rows.map((row) => headers.map((h) => escape(row[h])).join(','))].join('\n');
}

export async function GET(req: NextRequest) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.staff);
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
    const cls = searchParams.get('class');
    const section = searchParams.get('section');
    const type = searchParams.get('type') || 'csv';

    const records = await prisma.attendance.findMany({
      where: { ...tenantWhere(auth), date, ...(cls ? { class: cls } : {}), ...(section ? { section } : {}) },
      orderBy: [{ class: 'asc' }, { section: 'asc' }, { markedAt: 'asc' }],
    });

    const studentIds = Array.from(new Set(records.map((record) => record.studentId)));
    const students = studentIds.length ? await prisma.student.findMany({ where: { id: { in: studentIds } } }) : [];
    const studentMap = new Map(students.map((student) => [student.id, student]));

    const rows = records.map((record) => {
      const student = studentMap.get(record.studentId);
      return {
        Date: record.date,
        Name: student?.name || '',
        StudentID: student?.studentId || '',
        Roll: student?.rollNumber || '',
        Class: record.class,
        Section: record.section,
        Subject: record.subject || '',
        Period: record.period || '',
        Status: record.status,
        MarkedAt: record.markedAt ? new Date(record.markedAt).toLocaleString() : '',
        MarkedBy: record.markedBy,
      };
    });

    if (type === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="attendance-${date}.xlsx"`,
        },
      });
    }

    return new NextResponse(toCsv(rows), {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="attendance-${date}.csv"` },
    });
  } catch (error) {
    console.error('Attendance export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
