import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ClassSession } from '@/models/ClassSession';
import { getAuthFromRequest } from '@/lib/auth';
import { format } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');

    const sessions = await ClassSession.find({ date }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ sessions });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
