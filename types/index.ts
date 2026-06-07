export interface Student {
  _id: string;
  studentId: string;
  name: string;
  email: string;
  class: string;
  section: string;
  rollNumber: string;
  phone?: string;
  qrToken: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  _id: string;
  studentId: string;
  student: Student;
  class: string;
  section: string;
  date: string;
  status: 'present' | 'absent' | 'late';
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
  role: 'admin' | 'teacher';
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