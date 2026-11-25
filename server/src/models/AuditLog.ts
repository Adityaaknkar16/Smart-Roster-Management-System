import mongoose, { Schema } from 'mongoose';
import { IAuditLog } from '../types/index.js';

const AuditLogSchema = new Schema<IAuditLog>({
  rosterId: { type: Schema.Types.ObjectId, ref: 'Roster' } as any,
  userId: { type: Schema.Types.ObjectId, ref: 'Employee' } as any,
  userName: { type: String },
  action: { type: String, required: true },
  details: { type: Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
