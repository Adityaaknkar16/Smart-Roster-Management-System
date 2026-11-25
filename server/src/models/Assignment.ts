import mongoose, { Schema } from 'mongoose';
import { IAssignment } from '../types/index.js';

const AssignmentSchema = new Schema<IAssignment>({
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true } as any,
  processId: { type: Schema.Types.ObjectId, ref: 'Process', required: true } as any,
  isPrimary: { type: Boolean, default: true },
  allocationPercent: { type: Number, default: 100 },
}, { timestamps: true });

AssignmentSchema.index({ employeeId: 1, processId: 1 }, { unique: true });

export const Assignment = mongoose.model<IAssignment>('Assignment', AssignmentSchema);
