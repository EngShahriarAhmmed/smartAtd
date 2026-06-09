import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { duplicateError, restoreData, safeDeleteData, tenantWhere, withMongoId } from '@/lib/prisma-utils';

async function findScopedStudent(id: string, auth: ReturnType<typeof getAuthFromRequest>) {
  if (!auth) return null;
  return prisma.student.findFirst({ where: { id, ...tenantWhere(auth) } });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const student = await findScopedStudent(id, auth);
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    return NextResponse.json({ student: withMongoId(student) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const existing = await findScopedStudent(id, auth);
    if (!existing) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    const body = await req.json();
    const { name, email, studentId, class: cls, section, rollNumber, phone, guardianName, guardianPhone, photo } = body;

    if (!name || !email || !studentId || !cls || !section || !rollNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const student = await prisma.student.update({
      where: { id },
      data: {
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
      },
    });

    return NextResponse.json({ student: withMongoId(student) });
  } catch (error: unknown) {
    console.error(error);
    if (duplicateError(error)) {
      return NextResponse.json({ error: 'Student ID or email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const existing = await findScopedStudent(id, auth);
    if (!existing) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const student = body.restore
      ? await prisma.student.update({ where: { id }, data: restoreData({ active: true, status: 'active' }) })
      : await prisma.student.update({ where: { id }, data: { qrToken: uuidv4() } });

    return NextResponse.json({ student: withMongoId(student), message: body.restore ? 'Student restored successfully.' : 'QR token regenerated successfully.' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const existing = await findScopedStudent(id, auth);
    if (!existing) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    const permanent = new URL(req.url).searchParams.get('permanent') === 'true';
    if (permanent) {
      if (!existing.deletedAt) return NextResponse.json({ error: 'Safe delete this student before permanent delete.' }, { status: 400 });
      await prisma.student.delete({ where: { id } });
      return NextResponse.json({ message: 'Student permanently deleted.' });
    }

    await prisma.student.update({ where: { id }, data: safeDeleteData(auth, { active: false, status: 'inactive' }) });
    return NextResponse.json({ message: 'Student moved to deleted records.' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
