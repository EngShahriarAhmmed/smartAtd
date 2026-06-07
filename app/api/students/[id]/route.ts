import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Student } from '@/models/Student';
import { getAuthFromRequest } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    const { id } = await params;
    const student = await Student.findById(id);
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    return NextResponse.json({ student });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const { id } =  await params;
    const body = await req.json();

    const { name, email, studentId, class: cls, section, rollNumber, phone } = body;

    if (!name || !email || !studentId || !cls || !section || !rollNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const student = await Student.findByIdAndUpdate(
      id,
      {
        name,
        email,
        studentId,
        class: cls,
        section,
        rollNumber,
        phone,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({ student });
  } catch (error: unknown) {
    console.error(error);

    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json(
        { error: 'Student ID or email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const { id } = await params;

    const student = await Student.findByIdAndUpdate(
      id,
      { qrToken: uuidv4() },
      { new: true }
    );

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({ student });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const { id } = await params;

    const student = await Student.findByIdAndUpdate(
      id,
      { active: false },
      { new: true }
    );

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Student removed successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}