import mongoose, { Schema, Document } from 'mongoose';
import { TPendingProduct } from './pending-product.interface';

const PendingProductSchema: Schema = new Schema<TPendingProduct>(
  {
    productName: { type: String, required: true, trim: true },
    code: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    supplierName: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'partial_received', 'received'],
      default: 'pending',
    },
    receivedQuantity: { type: Number, min: 0, default: 0 },
    receivedAmount: { type: Number, min: 0, default: 0 },
    partialReceives: [
      {
        quantity: { type: Number, required: true },
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
      },
    ],
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

PendingProductSchema.index({ productName: 1 });
PendingProductSchema.index({ code: 1 });
PendingProductSchema.index({ status: 1 });

export const PendingProduct = mongoose.model<TPendingProduct & Document>(
  'PendingProduct',
  PendingProductSchema
);
