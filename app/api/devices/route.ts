import { NextRequest, NextResponse } from 'next/server';
import { DeviceStatus, UserRole } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth, ROLE_GROUPS } from '@/lib/rbac';
import { tenantWhere, withMongoIds } from '@/lib/prisma-utils';
import { createAuditLog } from '@/lib/audit';

const deviceStatuses = new Set<string>(Object.values(DeviceStatus));
const userRoles = new Set<string>(Object.values(UserRole));

function normalizeStatus(value: unknown) {
  if (!value) return undefined;
  const status = String(value);
  return deviceStatuses.has(status) ? (status as DeviceStatus) : undefined;
}

function normalizeRole(value: unknown) {
  if (!value) return undefined;
  const role = String(value);
  return userRoles.has(role) ? (role as UserRole) : undefined;
}

export async function GET(req: NextRequest) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.staff);
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const status = normalizeStatus(searchParams.get('status'));
    const page = Math.max(Number(searchParams.get('page')) || 1, 1);
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 10, 1), 100);
    const skip = (page - 1) * limit;
    const where = {
      ...tenantWhere(auth),
      ...(status ? { status } : {}),
    };

    const [devices, total] = await Promise.all([
      prisma.deviceBinding.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.deviceBinding.count({ where }),
    ]);

    return NextResponse.json({ devices: withMongoIds(devices), pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) } });
  } catch (error) {
    console.error('Device list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.staff);
    if (response) return response;

    const body = await req.json();
    const deviceId = String(body.deviceId || '').trim();
    if (!deviceId) return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });

    const requestedStatus = normalizeStatus(body.status);
    const canApprove = ROLE_GROUPS.institutionAdmin.includes(auth.role);
    const status = canApprove && requestedStatus ? requestedStatus : DeviceStatus.pending;

    const existing = await prisma.deviceBinding.findFirst({
      where: { ...tenantWhere(auth), deviceId },
    });

    const device = existing
      ? await prisma.deviceBinding.update({
          where: { id: existing.id },
          data: {
            deviceName: body.deviceName || body.name || existing.deviceName,
            userId: body.userId || existing.userId || auth.userId,
            role: normalizeRole(body.role) || existing.role || auth.role,
            status: canApprove && requestedStatus ? requestedStatus : existing.status,
            notes: body.notes !== undefined ? body.notes : existing.notes,
            ...(canApprove && requestedStatus === DeviceStatus.active ? { approvedBy: auth.userId, approvedAt: new Date() } : {}),
          },
        })
      : await prisma.deviceBinding.create({
          data: {
            institutionId: auth.institutionId,
            userId: body.userId || auth.userId,
            deviceName: body.deviceName || body.name || 'Registered Scanner Device',
            deviceId,
            deviceHash: body.deviceHash,
            role: normalizeRole(body.role) || auth.role,
            status,
            notes: body.notes,
            ...(status === DeviceStatus.active ? { approvedBy: auth.userId, approvedAt: new Date() } : {}),
          },
        });

    await createAuditLog({ req, auth, action: 'device.upsert', entity: 'DeviceBinding', entityId: device.id, after: device });
    return NextResponse.json({ device: { ...device, _id: device.id } });
  } catch (error) {
    console.error('Device create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.institutionAdmin);
    if (response) return response;

    const body = await req.json();
    const status = normalizeStatus(body.status);
    if (!body.id) return NextResponse.json({ error: 'Device id is required' }, { status: 400 });
    if (body.status && !status) return NextResponse.json({ error: 'Invalid device status' }, { status: 400 });

    const device = await prisma.deviceBinding.update({
      where: { id: body.id },
      data: {
        ...(body.deviceName ? { deviceName: body.deviceName } : {}),
        ...(status ? { status } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        ...(status === DeviceStatus.active ? { approvedBy: auth.userId, approvedAt: new Date() } : {}),
      },
    });

    await createAuditLog({ req, auth, action: 'device.update', entity: 'DeviceBinding', entityId: device.id, after: device });
    return NextResponse.json({ device: { ...device, _id: device.id } });
  } catch (error) {
    console.error('Device update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.institutionAdmin);
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Device id is required' }, { status: 400 });

    const device = await prisma.deviceBinding.update({
      where: { id },
      data: { status: DeviceStatus.revoked, deletedAt: new Date(), deletedBy: auth.userId },
    });

    await createAuditLog({ req, auth, action: 'device.revoke', entity: 'DeviceBinding', entityId: id, after: device });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Device delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
