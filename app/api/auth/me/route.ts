import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';

export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const user = await User.findById(auth.userId).select('-password');
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
