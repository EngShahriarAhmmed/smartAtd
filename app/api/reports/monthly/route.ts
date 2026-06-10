import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';
import { requireAuth, ROLE_GROUPS } from '@/lib/rbac';
import { getMonthlyAttendanceReport } from '@/lib/advanced-reports';

export async function GET(req: NextRequest) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.staff);
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const report = await getMonthlyAttendanceReport(auth, {
      month: searchParams.get('month') || format(new Date(), 'yyyy-MM'),
      class: searchParams.get('class') || undefined,
      section: searchParams.get('section') || undefined,
      subject: searchParams.get('subject') || undefined,
      period: searchParams.get('period') || undefined,
      threshold: Number(searchParams.get('threshold') || 75),
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error('Monthly attendance report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
