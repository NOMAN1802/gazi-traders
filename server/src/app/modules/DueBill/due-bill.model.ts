import mongoose, { Schema } from 'mongoose';
import { TDueBill, TDueBillPayment } from './due-bill.interface';

const DueBillPaymentSchema = new Schema<TDueBillPayment>(
  {
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'mobile_banking', 'cheque', 'other'],
      default: 'cash',
    },
    notes: { type: String },
  },
  { _id: true }
);

const DueBillSchema = new Schema<TDueBill>(
  {
    dueBillNumber: { type: String, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    customer: {
      name: { type: String, required: true },
      phone: { type: String },
      email: { type: String },
      address: { type: String },
    },
    partyName: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    payments: { type: [DueBillPaymentSchema], default: [] },
    status: {
      type: String,
      enum: ['pending', 'partial', 'paid'],
      default: 'pending',
    },
    notes: { type: String },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

DueBillSchema.pre('save', async function (next) {
  if (!this.dueBillNumber) {
    const count = await mongoose.model('DueBill').countDocuments();
    this.dueBillNumber = `DBL-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

export const DueBill = mongoose.model<TDueBill>('DueBill', DueBillSchema);
