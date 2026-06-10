import prisma from '@/lib/prisma';
import { tenantWhere } from '@/lib/prisma-utils';
import type { JWTPayload } from '@/lib/auth';

type ReportFilter = {
  from?: string;
  to?: string;
  date?: string;
  month?: string;
  class?: string;
  section?: string;
  subject?: string;
  period?: string;
  threshold?: number;
};

function dateWhere(filter: ReportFilter) {
  if (filter.date) return { date: filter.date };
  if (filter.month) {
    return {
      date: {
        gte: `${filter.month}-01`,
        lte: `${filter.month}-31`,
      },
    };
  }
  if (filter.from || filter.to) {
    return {
      date: {
        ...(filter.from ? { gte: filter.from } : {}),
        ...(filter.to ? { lte: filter.to } : {}),
      },
    };
  }
  return {};
}

export async function getDailyPeriodWiseReport(auth: JWTPayload, filter: ReportFilter) {
  const where = {
    ...tenantWhere(auth),
    ...dateWhere(filter),
    ...(filter.class ? { class: filter.class } : {}),
    ...(filter.section ? { section: filter.section } : {}),
    ...(filter.subject ? { subject: filter.subject } : {}),
    ...(filter.period ? { period: filter.period } : {}),
  };

  const attendance = await prisma.attendance.findMany({
    where,
    orderBy: [{ date: 'asc' }, { class: 'asc' }, { section: 'asc' }, { period: 'asc' }, { markedAt: 'asc' }],
  });

  const studentIds = Array.from(new Set(attendance.map((item) => item.studentId)));
  const students = studentIds.length
    ? await prisma.student.findMany({ where: { id: { in: studentIds } } })
    : [];
  const studentMap = new Map(students.map((student) => [student.id, student]));

  const rows = attendance.map((record) => {
    const student = studentMap.get(record.studentId);
    return {
      date: record.date,
      period: record.period || 'General',
      subject: record.subject || 'General',
      class: record.class,
      section: record.section,
      studentId: student?.studentId || record.studentId,
      name: student?.name || 'Unknown Student',
      rollNumber: student?.rollNumber || '',
      status: record.status,
      markedAt: record.markedAt,
      markedBy: record.markedBy,
      deviceId: record.deviceId || '',
    };
  });

  const summaryMap = new Map<string, { date: string; class: string; section: string; subject: string; period: string; present: number; late: number; absent: number; total: number }>();

  for (const row of rows) {
    const key = [row.date, row.class, row.section, row.subject, row.period].join('|');
    const item = summaryMap.get(key) || {
      date: row.date,
      class: row.class,
      section: row.section,
      subject: row.subject,
      period: row.period,
      present: 0,
      late: 0,
      absent: 0,
      total: 0,
    };
    item.total += 1;
    if (row.status === 'present') item.present += 1;
    if (row.status === 'late') item.late += 1;
    if (row.status === 'absent') item.absent += 1;
    summaryMap.set(key, item);
  }

  return { rows, summary: Array.from(summaryMap.values()) };
}

export async function getMonthlyAttendanceReport(auth: JWTPayload, filter: ReportFilter) {
  const studentWhere = {
    ...tenantWhere(auth),
    active: true,
    ...(filter.class ? { class: filter.class } : {}),
    ...(filter.section ? { section: filter.section } : {}),
  };

  const students = await prisma.student.findMany({
    where: studentWhere,
    orderBy: [{ class: 'asc' }, { section: 'asc' }, { rollNumber: 'asc' }],
  });

  const attendanceWhere = {
    ...tenantWhere(auth),
    ...dateWhere(filter),
    ...(filter.class ? { class: filter.class } : {}),
    ...(filter.section ? { section: filter.section } : {}),
    ...(filter.subject ? { subject: filter.subject } : {}),
    ...(filter.period ? { period: filter.period } : {}),
  };

  const attendance = await prisma.attendance.findMany({ where: attendanceWhere });

  const heldKeysByClassSection = new Map<string, Set<string>>();
  for (const record of attendance) {
    const classSection = `${record.class}|${record.section}`;
    const key = `${record.date}|${record.subject || 'General'}|${record.period || 'General'}`;
    if (!heldKeysByClassSection.has(classSection)) heldKeysByClassSection.set(classSection, new Set());
    heldKeysByClassSection.get(classSection)?.add(key);
  }

  const studentAttendance = new Map<string, { present: number; late: number; absent: number }>();
  for (const record of attendance) {
    const item = studentAttendance.get(record.studentId) || { present: 0, late: 0, absent: 0 };
    if (record.status === 'present') item.present += 1;
    if (record.status === 'late') item.late += 1;
    if (record.status === 'absent') item.absent += 1;
    studentAttendance.set(record.studentId, item);
  }

  const rows = students.map((student) => {
    const counts = studentAttendance.get(student.id) || { present: 0, late: 0, absent: 0 };
    const totalHeld = Math.max(heldKeysByClassSection.get(`${student.class}|${student.section}`)?.size || 0, counts.present + counts.late + counts.absent);
    const attended = counts.present + counts.late;
    const absent = Math.max(totalHeld - attended, counts.absent);
    const percentage = totalHeld > 0 ? Math.round((attended / totalHeld) * 100) : 0;
    return {
      studentId: student.studentId,
      name: student.name,
      rollNumber: student.rollNumber,
      class: student.class,
      section: student.section,
      guardianPhone: student.guardianPhone || '',
      present: counts.present,
      late: counts.late,
      absent,
      totalHeld,
      percentage,
      riskLevel: percentage < 60 ? 'Critical' : percentage < 75 ? 'High Risk' : percentage < 85 ? 'Warning' : 'Regular',
      nonCollegiate: totalHeld > 0 && percentage < (filter.threshold || 75),
    };
  });

  const totals = rows.reduce(
    (acc, item) => {
      acc.students += 1;
      acc.present += item.present;
      acc.late += item.late;
      acc.absent += item.absent;
      acc.totalHeld += item.totalHeld;
      if (item.nonCollegiate) acc.nonCollegiate += 1;
      return acc;
    },
    { students: 0, present: 0, late: 0, absent: 0, totalHeld: 0, nonCollegiate: 0 }
  );

  return { rows, totals };
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n');
}
