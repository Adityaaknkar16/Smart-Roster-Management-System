import mongoose, { Schema } from 'mongoose';
import { IEmployee } from '../types/index.js';

const EmployeeSchema = new Schema<IEmployee>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: false },
  podId: { type: Schema.Types.ObjectId, ref: 'Pod' } as any,
  role: { type: String, enum: ['manager', 'pod_lead', 'viewer'], default: 'viewer' },
  active: { type: Boolean, default: true },
  preferences: {
    preferredWeeklyOffs: { type: [Number], default: [0] },
    avoidDays: { type: [Number], default: [] },
  },
  maxConsecutiveWorkDays: { type: Number, default: 6 },
  weeklyOffsPerWeek: { type: Number, default: 1 },
}, { timestamps: true });

export const Employee = mongoose.model<IEmployee>('Employee', EmployeeSchema);
