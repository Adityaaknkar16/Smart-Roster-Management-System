import mongoose, { Schema } from 'mongoose';
import { IRoster } from '../types/index.js';

const RosterSchema = new Schema<IRoster>({
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  version: { type: Number, default: 1 },
  generatedAt: { type: Date, default: Date.now },
  lockedBy: { type: Schema.Types.ObjectId, ref: 'Employee' } as any,
  publishOverrideReason: { type: String },
}, { timestamps: true });

RosterSchema.index({ month: 1, year: 1, version: 1 }, { unique: true });

export const Roster = mongoose.model<IRoster>('Roster', RosterSchema);
