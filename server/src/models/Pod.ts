import mongoose, { Schema } from 'mongoose';
import { IPod } from '../types/index.js';

const PodSchema = new Schema<IPod>({
  name: { type: String, required: true, trim: true },
  leadEmployeeId: { type: Schema.Types.ObjectId, ref: 'Employee' } as any,
}, { timestamps: true });

export const Pod = mongoose.model<IPod>('Pod', PodSchema);
