import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { toJsonValue } from '@/lib/prisma-utils';
import type { JWTPayload } from '@/lib/auth';

export async function createAuditLog({
  req,
  auth,
  action,
  entity,
  entityId,
  before,
  after,
}: {
  req?: NextRequest;
  auth?: JWTPayload | null;
  action: string;
  entity: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        institutionId: auth?.institutionId,
        actorUserId: auth?.userId,
        actorEmail: auth?.email,
        action,
        entity,
        entityId,
        before: toJsonValue(before),
        after: toJsonValue(after),
        ipAddress: req?.headers.get('x-forwarded-for') || req?.headers.get('x-real-ip') || undefined,
        userAgent: req?.headers.get('user-agent') || undefined,
      },
    });
  } catch (error) {
    console.error('Audit log failed:', error);
  }
}
