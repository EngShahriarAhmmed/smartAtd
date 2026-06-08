export type UserRole = 'super_admin' | 'institution_admin' | 'admin' | 'teacher' | 'student' | 'parent';
export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface Institution {
  _id: string;
  name: string;
  code: string;
  address?: string;
  logo?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  _id: string;
  institutionId?: string;
  studentId: string;
  name: string;
  email: string;
  class: string;
  section: string;
  rollNumber: string;
  phone?: string;
  guardianName?: string;
  guardianPhone?: string;
  photo?: string;
  qrToken: string;
  active: boolean;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Teacher {
  _id: string;
  institutionId?: string;
  employeeId: string;
  name: string;
  designation?: string;
  department?: string;
  photo?: string;
  phone?: string;
  email?: string;
  active: boolean;
}

export interface AcademicClass {
  _id: string;
  institutionId?: string;
  name: string;
  code?: string;
  active: boolean;
}

export interface Section {
  _id: string;
  institutionId?: string;
  classId?: string;
  className?: string;
  name: string;
  active: boolean;
}

export interface Subject {
  _id: string;
  institutionId?: string;
  name: string;
  code: string;
  active: boolean;
}

export interface Period {
  _id: string;
  institutionId?: string;
  periodName: string;
  startTime: string;
  endTime: string;
  active: boolean;
}

export interface AttendanceRecord {
  _id: string;
  studentId: string | Student;
  student?: Student;
  teacherId?: string;
  class: string;
  section: string;
  subject?: string;
  period?: string;
  date: string;
  status: AttendanceStatus;
  markedAt: string;
  markedBy: string;
  sessionToken?: string;
}

export interface ClassSession {
  _id: string;
  class: string;
  section: string;
  subject: string;
  date: string;
  startTime: string;
  endTime?: string;
  createdBy: string;
  qrToken: string;
  active: boolean;
}

export interface User {
  _id: string;
  email: string;
  name: string;
  role: UserRole;
  institutionId?: string;
  active: boolean;
}

export interface DashboardStats {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  attendanceRate: number;
  recentAttendance: AttendanceRecord[];
  classStats: { class: string; present: number; total: number }[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
