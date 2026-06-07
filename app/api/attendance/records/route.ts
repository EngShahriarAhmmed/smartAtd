import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Attendance } from '@/models/Attendance';
import { Student } from '@/models/Student';
import { getAuthFromRequest } from '@/lib/auth';
import redis, { REDIS_KEYS } from '@/lib/redis';
import { format } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
    const cls = searchParams.get('class');
    const section = searchParams.get('section');
    const studentId = searchParams.get('studentId');

    // Try cache for today's data
    if (date === format(new Date(), 'yyyy-MM-dd') && !studentId) {
      const cacheKey = REDIS_KEYS.dashboardCache(`${date}-${cls || 'all'}-${section || 'all'}`);
      const cached = await redis.get(cacheKey);
      if (cached) {
        return NextResponse.json(JSON.parse(cached));
      }
    }

    await connectDB();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { date };
    if (cls) query.class = cls;
    if (section) query.section = section;
    if (studentId) query.studentId = studentId;

    const records = await Attendance.find(query)
      .populate('studentId', 'name studentId class section rollNumber email')
      .sort({ markedAt: -1 })
      .lean();

    // Get total students for this class/section
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const studentQuery: any = { active: true };
    if (cls) studentQuery.class = cls;
    if (section) studentQuery.section = section;
    const totalStudents = await Student.countDocuments(studentQuery);

    const result = { records, totalStudents, date };

    // Cache for 30 seconds
    if (date === format(new Date(), 'yyyy-MM-dd') && !studentId) {
      const cacheKey = REDIS_KEYS.dashboardCache(`${date}-${cls || 'all'}-${section || 'all'}`);
      await redis.setex(cacheKey, 30, JSON.stringify(result));
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
