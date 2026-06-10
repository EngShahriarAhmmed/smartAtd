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
    const page = Math.max(Number(searchParams.get('page')) || 1, 1);
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const where = {
      ...tenantWhere(auth),
      ...(auth.role === 'teacher' ? { teacherEmail: auth.email } : teacherEmail ? { teacherEmail } : {}),
      ...(date ? { date } : {}),
      ...(cls ? { class: cls } : {}),
      ...(section ? { section } : {}),
      ...(subject ? { subject } : {}),
      ...(period ? { period } : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.teacherClassLog.findMany({ where, orderBy: [{ date: 'desc' }, { startTime: 'desc' }], skip, take: limit }),
      prisma.teacherClassLog.count({ where }),
    ]);

    return NextResponse.json({ logs: withMongoIds(logs), pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) } });
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

    const teacherEmail = body.teacherEmail || auth.email;
    const subject = body.subject || '';
    const period = body.period || '';

    const existing = await prisma.teacherClassLog.findFirst({
      where: {
        ...tenantWhere(auth),
        teacherEmail,
        class: body.class,
        section: body.section,
        subject,
        period,
        date: body.date,
      },
    });

    const log = existing
      ? await prisma.teacherClassLog.update({
          where: { id: existing.id },
          data: {
            endTime: body.endTime ? new Date(body.endTime) : existing.endTime,
            scanCount: body.scanCount !== undefined ? Number(body.scanCount) : existing.scanCount,
          },
        })
      : await prisma.teacherClassLog.create({
          data: {
            institutionId: auth.institutionId,
            teacherEmail,
            teacherId: body.teacherId,
            class: body.class,
            section: body.section,
            subject,
            period,
            date: body.date,
            startTime: body.startTime ? new Date(body.startTime) : new Date(),
            endTime: body.endTime ? new Date(body.endTime) : undefined,
            scanCount: Number(body.scanCount || 0),
          },
        });

    await createAuditLog({ req, auth, action: existing ? 'teacherClassLog.updateExisting' : 'teacherClassLog.create', entity: 'TeacherClassLog', entityId: log.id, after: log });
    return NextResponse.json({ log: { ...log, _id: log.id }, existing: !!existing });
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
