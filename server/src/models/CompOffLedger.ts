import mongoose, { Schema } from 'mongoose';
import { ICompOffLedger } from '../types/index.js';

const CompOffLedgerSchema = new Schema<ICompOffLedger>({
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true } as any,
  earnedDate: { type: String, required: true },
  usedDate: { type: String },
  reason: { type: String },
}, { timestamps: true });

export const CompOffLedger = mongoose.model<ICompOffLedger>('CompOffLedger', CompOffLedgerSchema);
