import mongoose, { Schema } from 'mongoose';
import { IRosterEntry } from '../types/index.js';

const RosterEntrySchema = new Schema<IRosterEntry>({
  rosterId: { type: Schema.Types.ObjectId, ref: 'Roster', required: true } as any,
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true } as any,
  date: { type: String, required: true },
  status: {
    type: String,
    enum: ['WORK', 'WEEKLY_OFF', 'HOLIDAY', 'LEAVE', 'COMP_OFF'],
    default: 'WORK',
  },
  source: { type: String, enum: ['auto', 'manual'], default: 'auto' },
  locked: { type: Boolean, default: false },
}, { timestamps: true });

RosterEntrySchema.index({ rosterId: 1, employeeId: 1, date: 1 }, { unique: true });
RosterEntrySchema.index({ rosterId: 1, date: 1 });

export const RosterEntry = mongoose.model<IRosterEntry>('RosterEntry', RosterEntrySchema);
