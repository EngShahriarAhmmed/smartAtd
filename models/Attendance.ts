import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendance extends Document {
  studentId: mongoose.Types.ObjectId;
  class: string;
  section: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent' | 'late';
  markedAt: Date;
  markedBy: string;
  sessionToken?: string;
  ipAddress?: string;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    class: { type: String, required: true },
    section: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD format
    status: { type: String, enum: ['present', 'absent', 'late'], default: 'present' },
    markedAt: { type: Date, default: Date.now },
    markedBy: { type: String, required: true },
    sessionToken: { type: String },
    ipAddress: { type: String },
  },
  { timestamps: true }
);

// Unique: one record per student per date
AttendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ class: 1, section: 1, date: 1 });
AttendanceSchema.index({ date: 1 });

export const Attendance =
  mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', AttendanceSchema);
