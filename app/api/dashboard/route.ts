import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Attendance } from '@/models/Attendance';
import { Student } from '@/models/Student';
import { ClassSession } from '@/models/ClassSession';
import { getAuthFromRequest } from '@/lib/auth';
import redis, { REDIS_KEYS } from '@/lib/redis';
import { format } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const today = format(new Date(), 'yyyy-MM-dd');
    const cacheKey = REDIS_KEYS.dashboardCache(today);
    const cached = await redis.get(cacheKey);
    if (cached) return NextResponse.json(JSON.parse(cached));

    await connectDB();

    const [totalStudents, presentToday, lateToday, recentAttendance, sessions] = await Promise.all([
      Student.countDocuments({ active: true }),
      Attendance.countDocuments({ date: today, status: 'present' }),
      Attendance.countDocuments({ date: today, status: 'late' }),
      Attendance.find({ date: today })
        .populate('studentId', 'name studentId class section')
        .sort({ markedAt: -1 })
        .limit(10)
        .lean(),
      ClassSession.find({ date: today, active: true }).lean(),
    ]);

    // Per-class stats
    const classGroups = await Student.aggregate([
      { $match: { active: true } },
      { $group: { _id: { class: '$class', section: '$section' }, total: { $sum: 1 } } },
    ]);

    const classStats = await Promise.all(
      classGroups.map(async (g) => {
        const present = await Attendance.countDocuments({
          class: g._id.class, section: g._id.section,
          date: today, status: { $in: ['present', 'late'] },
        });
        return { class: `${g._id.class}-${g._id.section}`, present, total: g.total };
      })
    );

    const stats = {
      totalStudents,
      presentToday: presentToday + lateToday,
      lateToday,
      absentToday: totalStudents - presentToday - lateToday,
      attendanceRate: totalStudents > 0 ? Math.round(((presentToday + lateToday) / totalStudents) * 100) : 0,
      recentAttendance,
      classStats,
      activeSessions: sessions.length,
      date: today,
    };

    await redis.setex(cacheKey, 30, JSON.stringify(stats));
    return NextResponse.json(stats);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
