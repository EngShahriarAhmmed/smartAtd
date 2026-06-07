import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

import { connectDB } from '@/lib/mongodb';
import { Student } from '@/models/Student';
import { getAuthFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

type ExcelRow = Record<string, unknown>;

function normalizeHeader(value: string) {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[_-]/g, '');
}

function getCell(row: ExcelRow, possibleHeaders: string[]) {
  const normalizedRow: Record<string, unknown> = {};

  for (const key of Object.keys(row)) {
    normalizedRow[normalizeHeader(key)] = row[key];
  }

  for (const header of possibleHeaders) {
    const value = normalizedRow[normalizeHeader(header)];

    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }

  return '';
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    /**
     * Optional but recommended:
     * enable this if your auth payload has a role field.
     */
    if (auth.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { error: 'Excel or CSV file is required. Use form-data field name: file' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return NextResponse.json({ error: 'No sheet found in uploaded file' }, { status: 400 });
    }

    const worksheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json<ExcelRow>(worksheet, {
      defval: '',
    });

    if (!rows.length) {
      return NextResponse.json({ error: 'Uploaded file is empty' }, { status: 400 });
    }

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
        phone,
        qrToken: uuidv4(),
        active: true,
      };
    });

    const validStudents = parsedStudents.filter(Boolean) as Array<{
      name: string;
      email: string;
      studentId: string;
      class: string;
      section: string;
      rollNumber: string;
      phone: string;
      qrToken: string;
      active: boolean;
    }>;

    if (!validStudents.length) {
      return NextResponse.json(
        {
          error: 'No valid student rows found',
          totalRows: rows.length,
          errors,
        },
        { status: 400 }
      );
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

    const existingStudents = await Student.find({
      $or: [
        { studentId: { $in: uniqueFileStudents.map((student) => student.studentId) } },
        { email: { $in: uniqueFileStudents.map((student) => student.email) } },
      ],
    }).select('studentId email');

    const existingStudentIds = new Set(existingStudents.map((student) => student.studentId));
    const existingEmails = new Set(existingStudents.map((student) => student.email));

    const studentsToInsert = uniqueFileStudents.filter((student) => {
      const exists =
        existingStudentIds.has(student.studentId) || existingEmails.has(student.email);

      if (exists) {
        errors.push(`Already exists: ${student.studentId} / ${student.email}`);
        return false;
      }

      return true;
    });

    let insertedCount = 0;

    if (studentsToInsert.length > 0) {
      const insertedStudents = await Student.insertMany(studentsToInsert, {
        ordered: false,
      });

      insertedCount = insertedStudents.length;
    }

    return NextResponse.json(
      {
        message: 'Student upload completed',
        totalRows: rows.length,
        validRows: validStudents.length,
        insertedCount,
        skippedCount: rows.length - insertedCount,
        errors,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error(error);

    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json(
        { error: 'Duplicate Student ID or email found during upload' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}