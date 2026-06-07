import { quartersToMonths } from 'date-fns';
import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IStudent extends Document {
  studentId: string;
  name: string;
  email: string;
  class: string;
  section: string;
  rollNumber: string;
  phone?: string;
  qrToken: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    studentId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    class: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true },
    rollNumber: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    qrToken: { type: String, required: true, unique: true, default: () => uuidv4() },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

StudentSchema.index({ class: 1, section: 1, qrToken: 1 });

export const Student = mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);
