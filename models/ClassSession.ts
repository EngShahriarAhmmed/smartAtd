import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IClassSession extends Document {
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

const ClassSessionSchema = new Schema<IClassSession>(
  {
    class: { type: String, required: true },
    section: { type: String, required: true },
    subject: { type: String, required: true },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String },
    createdBy: { type: String, required: true },
    qrToken: { type: String, required: true, unique: true, default: () => uuidv4() },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ClassSessionSchema.index({ class: 1, section: 1, date: 1 });
ClassSessionSchema.index({ qrToken: 1 });

export const ClassSession =
  mongoose.models.ClassSession ||
  mongoose.model<IClassSession>('ClassSession', ClassSessionSchema);
