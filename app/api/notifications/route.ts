import { NextRequest, NextResponse } from 'next/server';
import { NotificationEvent, NotificationStatus, NotificationType, Prisma, UserRole } from '@prisma/client';
import prisma from '@/lib/prisma';
import { hasRole, requireAuth, ROLE_GROUPS } from '@/lib/rbac';
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

function unreadWhere(): Prisma.NotificationWhereInput {
  return { OR: [{ readAt: null }, { readAt: { isSet: false } }] } as Prisma.NotificationWhereInput;
}

function buildRecipientWhere(auth: { userId: string; email: string; role: string }): Prisma.NotificationWhereInput {
  const roles = auth.role === UserRole.admin || auth.role === UserRole.institution_admin
    ? [UserRole.admin, UserRole.institution_admin]
    : [auth.role as UserRole];

  return {
    OR: [
      { recipientUserId: auth.userId },
      { recipientEmail: auth.email },
      ...roles.map((role) => ({ recipientRole: role })),
      { recipientRole: null, recipientUserId: null, recipientEmail: null },
    ],
  };
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
    const { auth, response } = requireAuth(req, ROLE_GROUPS.authenticated);
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const page = Math.max(Number(searchParams.get('page')) || 1, 1);
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 10, 1), 100);
    const skip = (page - 1) * limit;
    const status = normalizeStatus(searchParams.get('status'));
    const event = searchParams.get('event');
    const validEvent = event && notificationEvents.has(event) ? (event as NotificationEvent) : undefined;
    const scope = searchParams.get('scope') || (hasRole(auth, ROLE_GROUPS.staff) ? 'all' : 'me');
    const unread = searchParams.get('unread') === 'true';

    const where: Prisma.NotificationWhereInput = {
      AND: [
        tenantWhere(auth),
        status ? { status } : {},
        validEvent ? { event: validEvent } : {},
        scope === 'me' ? buildRecipientWhere(auth) : {},
        unread ? unreadWhere() : {},
      ].filter((item) => Object.keys(item).length > 0),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          AND: [tenantWhere(auth), buildRecipientWhere(auth), unreadWhere()],
        },
      }),
    ]);

    return NextResponse.json({
      notifications: withMongoIds(notifications),
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
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
    const recipientRole = normalizeRole(body.recipientRole);
    const studentLookup = String(body.studentId || body.studentObjectId || '').trim();
    const className = String(body.class || '').trim();
    const section = String(body.section || '').trim();
    const subject = String(body.subject || '').trim();
    const period = String(body.period || '').trim();
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
          ...(subject ? { subject } : {}),
          ...(period ? { period } : {}),
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
              recipientUserId: student.userId || undefined,
              recipientRole: UserRole.parent,
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
          recipientRole: recipientRole || (event === NotificationEvent.admin_exception_alert ? UserRole.admin : undefined),
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
    const { auth, response } = requireAuth(req, ROLE_GROUPS.authenticated);
    if (response) return response;

    const body = await req.json();
    const ids = Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : [];
    if (!ids.length) return NextResponse.json({ error: 'Notification id is required' }, { status: 400 });

    if (body.action === 'read' || body.read === true) {
      const result = await prisma.notification.updateMany({
        where: { id: { in: ids }, ...tenantWhere(auth) },
        data: { readAt: new Date(), readBy: auth.userId },
      });
      return NextResponse.json({ success: true, count: result.count });
    }

    if (body.action === 'unread' || body.read === false) {
      const result = await prisma.notification.updateMany({
        where: { id: { in: ids }, ...tenantWhere(auth) },
        data: { readAt: null, readBy: null },
      });
      return NextResponse.json({ success: true, count: result.count });
    }

    if (!hasRole(auth, ROLE_GROUPS.staff)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const status = normalizeStatus(body.status);
    if (!status && body.status) return NextResponse.json({ error: 'Invalid notification status' }, { status: 400 });

    const notification = await prisma.notification.update({
      where: { id: ids[0] },
      data: {
        ...(status ? { status } : {}),
        ...(status === NotificationStatus.sent ? { sentAt: new Date() } : {}),
        ...(body.error !== undefined ? { error: body.error } : {}),
      },
    });

    await createAuditLog({ req, auth, action: 'notification.update', entity: 'Notification', entityId: ids[0], after: notification });
    return NextResponse.json({ notification: { ...notification, _id: notification.id } });
  } catch (error) {
    console.error('Notification update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
