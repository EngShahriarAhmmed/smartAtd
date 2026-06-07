import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { Student } from '@/models/Student';
import { v4 as uuidv4 } from 'uuid';

export async function POST() {
  try {
    await connectDB();

    // Create admin user
    const existingAdmin = await User.findOne({ email: 'admin@school.com' });
    if (!existingAdmin) {
      await User.create({
        email: 'admin@school.com',
        password: 'admin123',
        name: 'Admin User',
        role: 'admin',
      });
    }

    // Create teacher
    const existingTeacher = await User.findOne({ email: 'teacher@school.com' });
    if (!existingTeacher) {
      await User.create({
        email: 'teacher@school.com',
        password: 'teacher123',
        name: 'Demo Teacher',
        role: 'teacher',
      });
    }

    // Create demo students
    const demoStudents = [
      { studentId: 'STU001', name: 'Rahim Uddin', email: 'rahim@student.com', class: '10', section: 'A', rollNumber: '01' },
      { studentId: 'STU002', name: 'Karim Hossain', email: 'karim@student.com', class: '10', section: 'A', rollNumber: '02' },
      { studentId: 'STU003', name: 'Fatema Begum', email: 'fatema@student.com', class: '10', section: 'A', rollNumber: '03' },
      { studentId: 'STU004', name: 'Nasrin Akter', email: 'nasrin@student.com', class: '10', section: 'B', rollNumber: '01' },
      { studentId: 'STU005', name: 'Jahangir Alam', email: 'jahangir@student.com', class: '10', section: 'B', rollNumber: '02' },
      { studentId: 'STU006', name: 'Sumaiya Islam', email: 'sumaiya@student.com', class: '9', section: 'A', rollNumber: '01' },
      { studentId: 'STU007', name: 'Rafiqul Islam', email: 'rafiq@student.com', class: '9', section: 'A', rollNumber: '02' },
      { studentId: 'STU008', name: 'Tanzila Khatun', email: 'tanzila@student.com', class: '9', section: 'B', rollNumber: '01' },
    ];

    let created = 0;
    for (const s of demoStudents) {
      const exists = await Student.findOne({ studentId: s.studentId });
      if (!exists) {
        await Student.create({ ...s, qrToken: uuidv4() });
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeded: admin, teacher, ${created} students`,
      credentials: {
        admin: { email: 'admin@school.com', password: 'admin123' },
        teacher: { email: 'teacher@school.com', password: 'teacher123' },
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 });
  }
}
