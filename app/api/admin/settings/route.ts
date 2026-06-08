import { NextRequest, NextResponse } from 'next/server';
import { ActiveStatus } from '@prisma/client';

import prisma from '@/lib/prisma';
import { ROLE_GROUPS, requireAuth } from '@/lib/rbac';

type UpdateInstitutionBody = {
  institutionId?: string;
  name?: string;
  code?: string;
  address?: string;
  logo?: string;
  status?: ActiveStatus;
};

const allowedStatuses = new Set<ActiveStatus>([
  'active',
  'inactive',
  'suspended',
]);

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function serializeForJson(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

async function resolveInstitutionId(req: NextRequest, auth: {
  role: string;
  institutionId?: string;
}) {
  const { searchParams } = new URL(req.url);
  const queryInstitutionId = searchParams.get('institutionId');

  if (auth.role === 'super_admin' && queryInstitutionId) {
    return queryInstitutionId;
  }

  if (auth.institutionId) {
    return auth.institutionId;
  }

  if (auth.role === 'super_admin') {
    const firstInstitution = await prisma.institution.findFirst({
      orderBy: {
        createdAt: 'asc',
      },
    });

    return firstInstitution?.id || null;
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.institutionAdmin);

    if (response) return response;

    const institutionId = await resolveInstitutionId(req, auth);

    if (!institutionId) {
      return NextResponse.json({
        institution: null,
      });
    }

    const institution = await prisma.institution.findUnique({
      where: {
        id: institutionId,
      },
    });

    return NextResponse.json({
      institution: institution
        ? {
            ...institution,
            _id: institution.id,
          }
        : null,
    });
  } catch (error) {
    console.error('Settings GET error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.institutionAdmin);

    if (response) return response;

    const body = (await req.json()) as UpdateInstitutionBody;

    let institutionId = auth.institutionId || null;

    if (auth.role === 'super_admin') {
      institutionId =
        body.institutionId ||
        new URL(req.url).searchParams.get('institutionId') ||
        institutionId;
    }

    if (!institutionId) {
      return NextResponse.json(
        {
          error: 'No institution is assigned for this user.',
        },
        {
          status: 400,
        }
      );
    }

    const currentInstitution = await prisma.institution.findUnique({
      where: {
        id: institutionId,
      },
    });

    if (!currentInstitution) {
      return NextResponse.json(
        {
          error: 'Institution not found.',
        },
        {
          status: 404,
        }
      );
    }

    const name = cleanString(body.name);
    const code = cleanString(body.code).toUpperCase();
    const address = cleanString(body.address);
    const logo = cleanString(body.logo);
    const status = body.status;

    if (!name) {
      return NextResponse.json(
        {
          error: 'Institution name is required.',
        },
        {
          status: 400,
        }
      );
    }

    if (!code) {
      return NextResponse.json(
        {
          error: 'Institution code is required.',
        },
        {
          status: 400,
        }
      );
    }

    if (status && !allowedStatuses.has(status)) {
      return NextResponse.json(
        {
          error: 'Invalid institution status.',
        },
        {
          status: 400,
        }
      );
    }

    const existingCode = await prisma.institution.findUnique({
      where: {
        code,
      },
    });

    if (existingCode && existingCode.id !== institutionId) {
      return NextResponse.json(
        {
          error: 'Institution code already exists.',
        },
        {
          status: 409,
        }
      );
    }

    const updatedInstitution = await prisma.institution.update({
      where: {
        id: institutionId,
      },
      data: {
        name,
        code,
        address: address || null,
        logo: logo || null,
        status: status || currentInstitution.status,
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          institutionId: updatedInstitution.id,
          actorUserId: auth.userId,
          actorEmail: auth.email,
          action: 'UPDATE_INSTITUTION_SETTINGS',
          entity: 'Institution',
          entityId: updatedInstitution.id,
          before: serializeForJson(currentInstitution),
          after: serializeForJson(updatedInstitution),
          ipAddress:
            req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            req.headers.get('x-real-ip') ||
            null,
          userAgent: req.headers.get('user-agent'),
        },
      });
    } catch (auditError) {
      console.error('Audit log failed:', auditError);
    }

    return NextResponse.json({
      institution: {
        ...updatedInstitution,
        _id: updatedInstitution.id,
      },
    });
  } catch (error) {
    console.error('Settings PATCH error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      {
        status: 500,
      }
    );
  }
}