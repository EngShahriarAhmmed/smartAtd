import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { tenantWhere } from '@/lib/prisma-utils';

export const runtime = 'nodejs';

type ExcelRow = Record<string, unknown>;

function normalizeHeader(value: string) {
  return value.toString().trim().toLowerCase().replace(/\s+/g, '').replace(/[_-]/g, '');
}

function getCell(row: ExcelRow, possibleHeaders: string[]) {
  const normalizedRow: Record<string, unknown> = {};
  for (const key of Object.keys(row)) normalizedRow[normalizeHeader(key)] = row[key];
  for (const header of possibleHeaders) {
    const value = normalizedRow[normalizeHeader(header)];
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
  }
  return '';
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['super_admin', 'institution_admin', 'admin'].includes(auth.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Excel or CSV file is required. Use form-data field name: file' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return NextResponse.json({ error: 'No sheet found in uploaded file' }, { status: 400 });

    const rows = XLSX.utils.sheet_to_json<ExcelRow>(workbook.Sheets[sheetName], { defval: '' });
    if (!rows.length) return NextResponse.json({ error: 'Uploaded file is empty' }, { status: 400 });

    const errors: string[] = [];
    const parsedStudents = rows.map((row, index) => {
      const rowNumber = index + 2;
      const name = getCell(row, ['Name', 'Student Name']);
      const email = getCell(row, ['Email', 'Email Address']).toLowerCase();
      const studentId = getCell(row, ['Student ID', 'StudentId', 'StudentIdNo', 'ID']);
      const cls = getCell(row, ['Class', 'Class Name']);
      const section = getCell(row, ['Section']);
      const rollNumber = getCell(row, ['Roll Number', 'Roll', 'Roll No', 'RollNo']);
      const phone = getCell(row, ['Phone', 'Mobile', 'Contact']);
      const guardianName = getCell(row, ['Guardian Name', 'Guardian']);
      const guardianPhone = getCell(row, ['Guardian Phone', 'Parent Phone']);

      if (!name || !email || !studentId || !cls || !section || !rollNumber) {
        errors.push(`Row ${rowNumber}: Missing required fields`);
        return null;
      }

      return {
        name,
        email,
        studentId,
        class: cls,
        section,
        rollNumber,
        roll: rollNumber,
        phone,
        guardianName,
        guardianPhone,
        institutionId: auth.institutionId,
        qrToken: uuidv4(),
        active: true,
      };
    });

    const validStudents = parsedStudents.filter(Boolean) as Array<{
      name: string; email: string; studentId: string; class: string; section: string; rollNumber: string; roll: string; phone: string; guardianName: string; guardianPhone: string; institutionId?: string; qrToken: string; active: boolean;
    }>;

    if (!validStudents.length) {
      return NextResponse.json({ error: 'No valid student rows found', totalRows: rows.length, errors }, { status: 400 });
    }

    const uniqueFileStudents: typeof validStudents = [];
    const seenStudentIds = new Set<string>();
    const seenEmails = new Set<string>();
    for (const student of validStudents) {
      if (seenStudentIds.has(student.studentId) || seenEmails.has(student.email)) {
        errors.push(`Duplicate in uploaded file: ${student.studentId} / ${student.email}`);
        continue;
      }
      seenStudentIds.add(student.studentId);
      seenEmails.add(student.email);
      uniqueFileStudents.push(student);
    }

    const existingStudents = await prisma.student.findMany({
      where: {
        ...tenantWhere(auth),
        OR: [
          { studentId: { in: uniqueFileStudents.map((student) => student.studentId) } },
          { email: { in: uniqueFileStudents.map((student) => student.email) } },
        ],
      },
      select: { studentId: true, email: true },
    });

    const existingStudentIds = new Set(existingStudents.map((student) => student.studentId));
    const existingEmails = new Set(existingStudents.map((student) => student.email));
    const studentsToInsert = uniqueFileStudents.filter((student) => {
      const exists = existingStudentIds.has(student.studentId) || existingEmails.has(student.email);
      if (exists) {
        errors.push(`Already exists: ${student.studentId} / ${student.email}`);
        return false;
      }
      return true;
    });

    let insertedCount = 0;
    if (studentsToInsert.length > 0) {
      const result = await prisma.student.createMany({ data: studentsToInsert });
      insertedCount = result.count;
    }

    return NextResponse.json({
      message: 'Student upload completed',
      totalRows: rows.length,
      validRows: validStudents.length,
      insertedCount,
      skippedCount: rows.length - insertedCount,
      errors,
    }, { status: 201 });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
