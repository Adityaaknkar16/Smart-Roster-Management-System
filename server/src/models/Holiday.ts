import mongoose, { Schema } from 'mongoose';
import { IHoliday } from '../types/index.js';

const HolidaySchema = new Schema<IHoliday>({
  date: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  region: { type: String, default: 'India' },
}, { timestamps: true });

export const Holiday = mongoose.model<IHoliday>('Holiday', HolidaySchema);
