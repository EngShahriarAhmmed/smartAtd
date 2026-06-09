import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';

export async function POST() {
  try {
    const institution = await prisma.institution.upsert({
      where: { code: 'DEMO' },
      update: { name: 'Demo Institution', address: 'Dhaka, Bangladesh', status: 'active' },
      create: { name: 'Demo Institution', code: 'DEMO', address: 'Dhaka, Bangladesh', status: 'active' },
    });


    for (const [name, price, studentLimit, features] of [
      ['Basic', '৳0', 500, 'QR attendance, core reports, demo usage'],
      ['Professional', 'Custom', 2500, 'QR attendance, reports, SMS and Excel export'],
      ['Enterprise', 'Custom', 10000, 'Multi-campus, advanced analytics and priority support'],
    ] as const) {
      await prisma.subscriptionPlan.upsert({
        where: { name },
        update: { price, studentLimit, features, status: 'active' },
        create: { name, price, studentLimit, features, status: 'active' },
      });
    }

    for (const [category, key, value, notes] of [
      ['Security', 'jwt.expiry.minutes', '15', 'Access token expiry in minutes'],
      ['Security', 'password.minimum.length', '8', 'Minimum password length'],
      ['Notifications', 'sms.provider', 'manual', 'Replace with production SMS gateway'],
      ['Tenant Defaults', 'default.student.limit', '500', 'Default limit for new institutions'],
    ] as const) {
      await prisma.platformSetting.upsert({
        where: { category_key: { category, key } },
        update: { value, notes, status: 'active' },
        create: { category, key, value, notes, status: 'active' },
      });
    }

    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@school.com').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminHash = await bcrypt.hash(adminPassword, 12);

    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { institutionId: institution.id, name: process.env.ADMIN_NAME || 'Admin User', role: 'admin', active: true },
      create: { institutionId: institution.id, email: adminEmail, password: adminHash, name: process.env.ADMIN_NAME || 'Admin User', role: 'admin' },
    });


    const superAdminHash = await bcrypt.hash('superadmin123', 12);
    await prisma.user.upsert({
      where: { email: 'superadmin@platform.com' },
      update: { name: 'Platform Super Admin', role: 'super_admin', active: true, institutionId: null },
      create: { email: 'superadmin@platform.com', password: superAdminHash, name: 'Platform Super Admin', role: 'super_admin' },
    });

    const parentHash = await bcrypt.hash('parent123', 12);
    const parentUser = await prisma.user.upsert({
      where: { email: 'parent@school.com' },
      update: { institutionId: institution.id, name: 'Demo Parent', role: 'parent', active: true },
      create: { institutionId: institution.id, email: 'parent@school.com', password: parentHash, name: 'Demo Parent', role: 'parent' },
    });

    const studentHash = await bcrypt.hash('student123', 12);
    const studentUser = await prisma.user.upsert({
      where: { email: 'student@school.com' },
      update: { institutionId: institution.id, name: 'Demo Student', role: 'student', active: true },
      create: { institutionId: institution.id, email: 'student@school.com', password: studentHash, name: 'Demo Student', role: 'student' },
    });

    const teacherHash = await bcrypt.hash('teacher123', 12);
    const teacherUser = await prisma.user.upsert({
      where: { email: 'teacher@school.com' },
      update: { institutionId: institution.id, name: 'Demo Teacher', role: 'teacher', active: true },
      create: { institutionId: institution.id, email: 'teacher@school.com', password: teacherHash, name: 'Demo Teacher', role: 'teacher' },
    });

    const existingTeacher = await prisma.teacher.findFirst({ where: { institutionId: institution.id, employeeId: 'T001' } });
    if (existingTeacher) {
      await prisma.teacher.update({ where: { id: existingTeacher.id }, data: { userId: teacherUser.id, name: 'Demo Teacher', designation: 'Assistant Teacher', department: 'Science', email: 'teacher@school.com', active: true } });
    } else {
      await prisma.teacher.create({ data: { institutionId: institution.id, userId: teacherUser.id, employeeId: 'T001', name: 'Demo Teacher', designation: 'Assistant Teacher', department: 'Science', email: 'teacher@school.com', active: true } });
    }

    const seededClasses = new Map<string, string>();
    for (const c of ['6', '7', '8', '9', '10', '11', '12']) {
      const classItem = await prisma.class.upsert({
        where: { institutionId_name: { institutionId: institution.id, name: c } },
        update: { code: `CLASS-${c}`, active: true },
        create: { institutionId: institution.id, name: c, code: `CLASS-${c}`, active: true },
      });
      seededClasses.set(c, classItem.id);
    }

    for (const sec of ['A', 'B']) {
      const existingSections = await prisma.section.findMany({
        where: { institutionId: institution.id, name: sec },
        orderBy: { createdAt: 'asc' },
      });

      if (existingSections.length) {
        const [primary, ...duplicates] = existingSections;
        await prisma.section.update({
          where: { id: primary.id },
          data: { classId: null, className: null, active: true, deletedAt: null, deletedBy: null },
        });

        for (const duplicate of duplicates) {
          await prisma.section.update({
            where: { id: duplicate.id },
            data: { active: false, deletedAt: duplicate.deletedAt ?? new Date(), deletedBy: duplicate.deletedBy ?? null },
          });
        }
      } else {
        await prisma.section.create({
          data: { institutionId: institution.id, classId: null, className: null, name: sec, active: true },
        });
      }
    }

    for (const [name, code] of [
      ['Mathematics', 'MATH'],
      ['Physics', 'PHY'],
      ['Chemistry', 'CHEM'],
      ['English', 'ENG'],
      ['Bangla', 'BAN'],
      ['ICT', 'ICT'],
    ]) {
      const existing = await prisma.subject.findFirst({ where: { institutionId: institution.id, code } });
      if (existing) {
        await prisma.subject.update({ where: { id: existing.id }, data: { name, active: true } });
      } else {
        await prisma.subject.create({ data: { institutionId: institution.id, name, code, active: true } });
      }
    }

    for (const [periodName, startTime, endTime] of [
      ['1st Period', '09:00', '09:45'],
      ['2nd Period', '09:45', '10:30'],
      ['3rd Period', '10:45', '11:30'],
      ['4th Period', '11:30', '12:15'],
    ]) {
      const existing = await prisma.period.findFirst({ where: { institutionId: institution.id, periodName } });
      if (existing) {
        await prisma.period.update({ where: { id: existing.id }, data: { startTime, endTime, active: true } });
      } else {
        await prisma.period.create({ data: { institutionId: institution.id, periodName, startTime, endTime, active: true } });
      }
    }

    const demoStudents = [
      { studentId: 'STU001', name: 'Rahim Uddin', email: 'rahim@student.com', class: '10', section: 'A', rollNumber: '01', guardianName: 'Mr. Uddin', guardianPhone: '01700000001' },
      { studentId: 'STU002', name: 'Karim Hossain', email: 'karim@student.com', class: '10', section: 'A', rollNumber: '02', guardianName: 'Mr. Hossain', guardianPhone: '01700000002' },
      { studentId: 'STU003', name: 'Fatema Begum', email: 'fatema@student.com', class: '10', section: 'A', rollNumber: '03', guardianName: 'Mrs. Begum', guardianPhone: '01700000003' },
      { studentId: 'STU004', name: 'Nasrin Akter', email: 'nasrin@student.com', class: '10', section: 'B', rollNumber: '01', guardianName: 'Mr. Akter', guardianPhone: '01700000004' },
      { studentId: 'STU005', name: 'Jahangir Alam', email: 'jahangir@student.com', class: '10', section: 'B', rollNumber: '02', guardianName: 'Mr. Alam', guardianPhone: '01700000005' },
      { studentId: 'STU006', name: 'Sumaiya Islam', email: 'sumaiya@student.com', class: '9', section: 'A', rollNumber: '01', guardianName: 'Mr. Islam', guardianPhone: '01700000006' },
      { studentId: 'STU007', name: 'Rafiqul Islam', email: 'rafiq@student.com', class: '9', section: 'A', rollNumber: '02', guardianName: 'Mr. Islam', guardianPhone: '01700000007' },
      { studentId: 'STU008', name: 'Tanzila Khatun', email: 'tanzila@student.com', class: '9', section: 'B', rollNumber: '01', guardianName: 'Mr. Khatun', guardianPhone: '01700000008' },
    ];

    let created = 0;
    for (const student of demoStudents) {
      const exists = await prisma.student.findFirst({ where: { institutionId: institution.id, studentId: student.studentId } });
      if (!exists) {
        await prisma.student.create({ data: { institutionId: institution.id, ...student, email: student.email.toLowerCase(), roll: student.rollNumber, qrToken: uuidv4(), userId: student.studentId === 'STU001' ? studentUser.id : undefined, guardianUserId: student.studentId === 'STU001' ? parentUser.id : undefined } });
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeded demo institution, users, admin, teacher, subjects, periods and ${created} students`,
      credentials: {
        admin: { email: adminEmail, password: adminPassword },
        teacher: { email: 'teacher@school.com', password: 'teacher123' },
        superAdmin: { email: 'superadmin@platform.com', password: 'superadmin123' },
        student: { email: 'student@school.com', password: 'student123' },
        parent: { email: 'parent@school.com', password: 'parent123' },
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 });
  }
}
