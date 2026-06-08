import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { duplicateError, tenantWhere, withMongoId, withMongoIds } from '@/lib/prisma-utils';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const cls = searchParams.get('class');
    const section = searchParams.get('section');
    const search = searchParams.get('search');
    const page = Math.max(Number(searchParams.get('page')) || 1, 1);
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const where = {
      ...tenantWhere(auth),
      active: true,
      ...(cls ? { class: cls } : {}),
      ...(section ? { section } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { studentId: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        orderBy: [{ class: 'asc' }, { section: 'asc' }, { rollNumber: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.student.count({ where }),
    ]);

    return NextResponse.json({
      students: withMongoIds(students),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { name, email, studentId, class: cls, section, rollNumber, phone, guardianName, guardianPhone, photo } = body;

    if (!name || !email || !studentId || !cls || !section || !rollNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const student = await prisma.student.create({
      data: {
        institutionId: auth.institutionId,
        name,
        email: String(email).toLowerCase(),
        studentId,
        class: cls,
        section,
        rollNumber,
        roll: rollNumber,
        phone,
        guardianName,
        guardianPhone,
        photo,
        qrToken: uuidv4(),
      },
    });

    return NextResponse.json({ student: withMongoId(student) }, { status: 201 });
  } catch (error: unknown) {
    console.error(error);
    if (duplicateError(error)) {
      return NextResponse.json({ error: 'Student ID or email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
