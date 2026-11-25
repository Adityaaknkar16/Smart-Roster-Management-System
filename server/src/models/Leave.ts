import mongoose, { Schema } from 'mongoose';
import { ILeave } from '../types/index.js';

const LeaveSchema = new Schema<ILeave>({
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true } as any,
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  type: { type: String, enum: ['planned', 'comp_off', 'sick'], default: 'planned' },
  status: { type: String, enum: ['requested', 'approved', 'rejected'], default: 'requested' },
}, { timestamps: true });

export const Leave = mongoose.model<ILeave>('Leave', LeaveSchema);
