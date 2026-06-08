import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { createOpaqueQrToken } from '@/lib/qr-token';

export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const student = await prisma.student.findFirst({ where: { userId: auth.userId, active: true } });
    if (!student) return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });

    const institution = student.institutionId ? await prisma.institution.findUnique({ where: { id: student.institutionId } }) : null;
    const qrDataUrl = await QRCode.toDataURL(JSON.stringify({ token: createOpaqueQrToken(student.qrToken) }), {
      width: 420,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    });

    return NextResponse.json({
      student: { ...student, _id: student.id },
      institution: institution ? { ...institution, _id: institution.id } : null,
      qrDataUrl,
    });
  } catch (error) {
    console.error('Student ID card error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
