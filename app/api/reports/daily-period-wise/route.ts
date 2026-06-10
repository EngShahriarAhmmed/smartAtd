import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';
import { requireAuth, ROLE_GROUPS } from '@/lib/rbac';
import { getDailyPeriodWiseReport } from '@/lib/advanced-reports';

export async function GET(req: NextRequest) {
  try {
    const { auth, response } = requireAuth(req, ROLE_GROUPS.staff);
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const report = await getDailyPeriodWiseReport(auth, {
      date: searchParams.get('date') || format(new Date(), 'yyyy-MM-dd'),
      class: searchParams.get('class') || undefined,
      section: searchParams.get('section') || undefined,
      subject: searchParams.get('subject') || undefined,
      period: searchParams.get('period') || undefined,
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error('Daily period-wise report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
