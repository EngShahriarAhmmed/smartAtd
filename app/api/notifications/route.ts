import { NextRequest, NextResponse } from 'next/server';
import { NotificationEvent, NotificationStatus, NotificationType, UserRole } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth, ROLE_GROUPS } from '@/lib/rbac';
import { tenantWhere, withMongoIds } from '@/lib/prisma-utils';
import { createAuditLog } from '@/lib/audit';

type StudentMessageData = {
  name: string;
  studentId: string;
  class: string;
  section: string;
};

const notificationEvents = new Set<string>(Object.values(NotificationEvent));
const notificationTypes = new Set<string>(Object.values(NotificationType));
const notificationStatuses = new Set<string>(Object.values(NotificationStatus));
const userRoles = new Set<string>(Object.values(UserRole));

function normalizeEvent(value: unknown): NotificationEvent {
  const event = String(value || NotificationEvent.guardian_alert);
  return notificationEvents.has(event) ? (event as NotificationEvent) : NotificationEvent.guardian_alert;
}

function normalizeType(value: unknown): NotificationType {
  const type = String(value || NotificationType.sms);
  return notificationTypes.has(type) ? (type as NotificationType) : NotificationType.sms;
}

function normalizeStatus(value: unknown) {
  if (!value) return undefined;
  const status = String(value);
  return notificationStatuses.has(status) ? (status as NotificationStatus) : undefined;
}

function normalizeRole(value: unknown) {
  if (!value) return undefined;
  const role = String(value);
  return userRoles.has(role) ? (role as UserRole) : undefined;
}

function buildMessage(event: NotificationEvent, student?: StudentMessageData, customMessage?: string) {
  if (customMessage?.trim()) return customMessage.trim();

  const studentLabel = student ? `${student.name} (${student.studentId})` : 'Student';

  if (event === NotificationEvent.guardian_alert) return `Guardian alert: ${studentLabel} needs attention regarding attendance.`;
  if (event === NotificationEvent.student_warning) return `Student warning: ${studentLabel}, your attendance is below required level.`;
  if (event === NotificationEvent.class_teacher_notification) return `Class teacher notification: Please review attendance for ${studentLabel}.`;
  if (event === NotificationEvent.admin_exception_alert) return `Admin exception alert: Attendance exception detected for ${studentLabel}.`;
  if (event === NotificationEvent.student_absent) return `${studentLabel} is absent today.`;
  if (event === NotificationEvent.low_attendance) return `${studentLabel} has low attendance.`;
  if (event === NotificationEvent.non_collegiate_risk) return `${studentLabel} is at non-collegiate risk.`;
  if (event === NotificationEvent.attendance_correction) return `Attendance correction notice for ${studentLabel}.`;

  return `Attendance notification for ${studentLabel}.`;
}

function titleFromEvent(event: NotificationEvent) {
  return event.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function GET(req: NextRequest) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.staff);
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const status = normalizeStatus(searchParams.get('status'));
    const event = searchParams.get('event');
    const validEvent = event && notificationEvents.has(event) ? (event as NotificationEvent) : undefined;

    const notifications = await prisma.notification.findMany({
      where: {
        ...tenantWhere(auth),
        ...(status ? { status } : {}),
        ...(validEvent ? { event: validEvent } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(searchParams.get('limit') || 100), 500),
    });

    return NextResponse.json({ notifications: withMongoIds(notifications) });
  } catch (error) {
    console.error('Notification list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.staff);
    if (response) return response;

    const body = await req.json();
    const event = normalizeEvent(body.event);
    const type = normalizeType(body.type);
    const studentLookup = String(body.studentId || body.studentObjectId || '').trim();
    const className = String(body.class || '').trim();
    const section = String(body.section || '').trim();
    const date = String(body.date || '').trim();

    let created: any[] = [];

    if (body.bulk === 'absent_guardians') {
      const students = await prisma.student.findMany({
        where: {
          ...tenantWhere(auth),
          active: true,
          OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
          ...(className ? { class: className } : {}),
          ...(section ? { section } : {}),
        },
      });

      const attendance = await prisma.attendance.findMany({
        where: {
          ...tenantWhere(auth),
          ...(date ? { date } : {}),
          ...(className ? { class: className } : {}),
          ...(section ? { section } : {}),
          status: { in: ['present', 'late'] },
        },
        select: { studentId: true },
      });

      const attendedIds = new Set(attendance.map((item) => item.studentId));
      const absentStudents = students.filter((student) => !attendedIds.has(student.id));

      created = await Promise.all(
        absentStudents.map((student) =>
          prisma.notification.create({
            data: {
              institutionId: student.institutionId,
              studentId: student.id,
              recipientName: student.guardianName || student.name,
              recipientPhone: student.guardianPhone || student.phone,
              recipientEmail: student.email,
              guardianPhone: student.guardianPhone,
              guardianEmail: undefined,
              type,
              event: NotificationEvent.guardian_alert,
              title: body.title?.trim() || 'Guardian Absence Alert',
              message: buildMessage(NotificationEvent.student_absent, student, body.message),
            },
          })
        )
      );
    } else {
      const student = studentLookup
        ? await prisma.student.findFirst({
            where: {
              ...tenantWhere(auth),
              OR: [{ id: studentLookup }, { studentId: studentLookup }],
            },
          })
        : null;

      if (studentLookup && !student) {
        return NextResponse.json({ error: 'Student not found for selected institution.' }, { status: 404 });
      }

      const notification = await prisma.notification.create({
        data: {
          institutionId: auth.institutionId || student?.institutionId,
          studentId: student?.id,
          recipientUserId: body.recipientUserId || student?.userId || undefined,
          recipientRole: normalizeRole(body.recipientRole),
          recipientName: body.recipientName || student?.guardianName || student?.name || undefined,
          recipientEmail: body.recipientEmail || student?.email || undefined,
          recipientPhone: body.recipientPhone || student?.guardianPhone || student?.phone || undefined,
          guardianPhone: student?.guardianPhone,
          guardianEmail: undefined,
          type,
          event,
          title: body.title?.trim() || titleFromEvent(event),
          message: buildMessage(event, student || undefined, body.message),
        },
      });
      created = [notification];
    }

    await createAuditLog({ req, auth, action: 'notification.create', entity: 'Notification', after: { count: created.length, event } });

    return NextResponse.json({ success: true, count: created.length, notifications: withMongoIds(created) });
  } catch (error) {
    console.error('Notification create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.staff);
    if (response) return response;

    const body = await req.json();
    const status = normalizeStatus(body.status);
    if (!body.id) return NextResponse.json({ error: 'Notification id is required' }, { status: 400 });
    if (!status && body.status) return NextResponse.json({ error: 'Invalid notification status' }, { status: 400 });

    const notification = await prisma.notification.update({
      where: { id: body.id },
      data: {
        ...(status ? { status } : {}),
        ...(status === NotificationStatus.sent ? { sentAt: new Date() } : {}),
        ...(body.error !== undefined ? { error: body.error } : {}),
      },
    });

    await createAuditLog({ req, auth, action: 'notification.update', entity: 'Notification', entityId: body.id, after: notification });
    return NextResponse.json({ notification: { ...notification, _id: notification.id } });
  } catch (error) {
    console.error('Notification update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
