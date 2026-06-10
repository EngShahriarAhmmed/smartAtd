import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, ROLE_GROUPS } from '@/lib/rbac';
import { tenantWhere, withMongoIds } from '@/lib/prisma-utils';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.staff);
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const teacherEmail = searchParams.get('teacherEmail');
    const cls = searchParams.get('class');
    const section = searchParams.get('section');
    const subject = searchParams.get('subject');
    const period = searchParams.get('period');

    const logs = await prisma.teacherClassLog.findMany({
      where: {
        ...tenantWhere(auth),
        ...(auth.role === 'teacher' ? { teacherEmail: auth.email } : teacherEmail ? { teacherEmail } : {}),
        ...(date ? { date } : {}),
        ...(cls ? { class: cls } : {}),
        ...(section ? { section } : {}),
        ...(subject ? { subject } : {}),
        ...(period ? { period } : {}),
      },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
      take: Number(searchParams.get('limit') || 200),
    });

    return NextResponse.json({ logs: withMongoIds(logs) });
  } catch (error) {
    console.error('Teacher class log list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.staff);
    if (response) return response;
    const body = await req.json();

    if (!body.class || !body.section || !body.date) {
      return NextResponse.json({ error: 'Class, section and date are required' }, { status: 400 });
    }

    const log = await prisma.teacherClassLog.create({
      data: {
        institutionId: auth.institutionId,
        teacherEmail: body.teacherEmail || auth.email,
        teacherId: body.teacherId,
        class: body.class,
        section: body.section,
        subject: body.subject || '',
        period: body.period || '',
        date: body.date,
        startTime: body.startTime ? new Date(body.startTime) : new Date(),
        endTime: body.endTime ? new Date(body.endTime) : undefined,
        scanCount: Number(body.scanCount || 0),
      },
    });

    await createAuditLog({ req, auth, action: 'teacherClassLog.create', entity: 'TeacherClassLog', entityId: log.id, after: log });
    return NextResponse.json({ log: { ...log, _id: log.id } });
  } catch (error) {
    console.error('Teacher class log create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.staff);
    if (response) return response;
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: 'Log id is required' }, { status: 400 });

    const log = await prisma.teacherClassLog.update({
      where: { id: body.id },
      data: {
        ...(body.endTime ? { endTime: new Date(body.endTime) } : {}),
        ...(body.scanCount !== undefined ? { scanCount: Number(body.scanCount) } : {}),
        ...(body.subject !== undefined ? { subject: body.subject } : {}),
        ...(body.period !== undefined ? { period: body.period } : {}),
      },
    });

    await createAuditLog({ req, auth, action: 'teacherClassLog.update', entity: 'TeacherClassLog', entityId: log.id, after: log });
    return NextResponse.json({ log: { ...log, _id: log.id } });
  } catch (error) {
    console.error('Teacher class log update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
