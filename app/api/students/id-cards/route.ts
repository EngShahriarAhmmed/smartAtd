import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import prisma from '@/lib/prisma';
import { ROLE_GROUPS, requireAuth } from '@/lib/rbac';
import { tenantWhere } from '@/lib/prisma-utils';
import { createOpaqueQrToken } from '@/lib/qr-token';

function qrPayload(rawToken: string) {
  return JSON.stringify({ token: createOpaqueQrToken(rawToken) });
}

export async function GET(req: NextRequest) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.institutionAdmin);
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const cls = searchParams.get('class');
    const section = searchParams.get('section');
    const search = searchParams.get('search');
    const page = Math.max(Number(searchParams.get('page')) || 1, 1);
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 100, 1), 500);
    const skip = (page - 1) * limit;

    if (!cls && !section && !search) {
      return NextResponse.json({ error: 'At least one filter is required' }, { status: 400 });
    }

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
              { rollNumber: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [institution, students, total] = await Promise.all([
      auth.institutionId ? prisma.institution.findUnique({ where: { id: auth.institutionId } }) : null,
      prisma.student.findMany({
        where,
        orderBy: [{ class: 'asc' }, { section: 'asc' }, { rollNumber: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.student.count({ where }),
    ]);

    const cards = await Promise.all(
      students.map(async (student) => ({
        student: { ...student, _id: student.id },
        qrDataUrl: await QRCode.toDataURL(qrPayload(student.qrToken), {
          width: 420,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: { dark: '#0f172a', light: '#ffffff' },
        }),
      }))
    );

    return NextResponse.json({
      institution: institution ? { ...institution, _id: institution.id } : null,
      cards,
      pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
    });
  } catch (error) {
    console.error('ID card QR generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
