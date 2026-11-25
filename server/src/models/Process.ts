import mongoose, { Schema } from 'mongoose';
import { IProcess } from '../types/index.js';

const ProcessDateOverrideSchema = new Schema({
  date: { type: String, required: true },
  minStaff: { type: Number, required: true },
}, { _id: false });

const ProcessSchema = new Schema<IProcess>({
  brandId: { type: Schema.Types.ObjectId, ref: 'Brand', required: true } as any,
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['CS', 'ACC', 'Retention', 'NDR', 'custom'], default: 'CS' },
  calendarMode: {
    type: String,
    enum: ['ALL_365', 'EXCEPT_HOLIDAYS', 'EXCEPT_SUN_AND_HOLIDAYS', 'CUSTOM'],
    default: 'ALL_365',
  },
  customClosedWeekdays: { type: [Number], default: [] },
  minStaffDefault: { type: Number, required: true, default: 1 },
  minStaffByWeekday: { type: Map, of: Number, default: {} },
  dateOverrides: { type: [ProcessDateOverrideSchema], default: [] },
}, { timestamps: true });

export const Process = mongoose.model<IProcess>('Process', ProcessSchema);
