import mongoose, { Schema } from 'mongoose';
import { IBrand } from '../types/index.js';

const BrandSchema = new Schema<IBrand>({
  name: { type: String, required: true, trim: true },
  podId: { type: Schema.Types.ObjectId, ref: 'Pod' } as any,
  active: { type: Boolean, default: true },
}, { timestamps: true });

export const Brand = mongoose.model<IBrand>('Brand', BrandSchema);
