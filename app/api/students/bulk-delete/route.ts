import { NextRequest, NextResponse } from 'next/server';

import { connectDB } from '@/lib/mongodb';
import { Student } from '@/models/Student';
import { getAuthFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const body = await req.json();
    const ids = body.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Student IDs are required' },
        { status: 400 }
      );
    }

    const result = await Student.updateMany(
      { _id: { $in: ids } },
      { active: false }
    );

    return NextResponse.json({
      message: 'Selected students removed successfully',
      removedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}