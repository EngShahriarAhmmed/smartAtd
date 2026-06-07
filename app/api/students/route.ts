import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Student } from '@/models/Student';
import { getAuthFromRequest } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const { searchParams } = new URL(req.url);

    const cls = searchParams.get('class');
    const section = searchParams.get('section');
    const search = searchParams.get('search');

    const page = Math.max(Number(searchParams.get('page')) || 1, 1);
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 10, 1), 100);
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { active: true };

    if (cls) query.class = cls;
    if (section) query.section = section;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [students, total] = await Promise.all([
      Student.find(query)
        .sort({ class: 1, section: 1, rollNumber: 1 })
        .skip(skip)
        .limit(limit),
      Student.countDocuments(query),
    ]);

    return NextResponse.json({
      students,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const body = await req.json();
    const { name, email, studentId, class: cls, section, rollNumber, phone } = body;

    if (!name || !email || !studentId || !cls || !section || !rollNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const student = await Student.create({
      name, email, studentId, class: cls, section, rollNumber, phone,
      qrToken: uuidv4(),
    });

    return NextResponse.json({ student }, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json({ error: 'Student ID or email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
