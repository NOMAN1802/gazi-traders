import mongoose, { Schema } from 'mongoose';
import { TStockIntake, TStockIntakeItem } from './stock-intake.interface';

const StockIntakeItemSchema = new Schema<TStockIntakeItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    categoryName: { type: String },
    unit: { type: String, enum: ['Dozen', 'Cartoon'] },
    cartoonSize: { type: Number, min: 0 },
    orderedQty: { type: Number, required: true, min: 0 },
    receivedQty: { type: Number, required: true, min: 0 },
    pendingQty: { type: Number, required: true, min: 0 },
    orderedPieces: { type: Number, required: true, min: 0 },
    receivedPieces: { type: Number, required: true, min: 0 },
    pendingPieces: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const StockIntakeSchema = new Schema<TStockIntake>(
  {
    intakeNumber: { type: String, required: true, unique: true },
    items: {
      type: [StockIntakeItemSchema],
      required: true,
      validate: [(v: TStockIntakeItem[]) => v.length > 0, 'At least one item required'],
    },
    notes: { type: String },
    status: { type: String, enum: ['complete', 'partial'], required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

StockIntakeSchema.pre('validate', async function () {
  if (!this.intakeNumber) {
    const last = await mongoose.model('StockIntake').findOne({}, { intakeNumber: 1 }, { sort: { createdAt: -1 } });
    let lastNum = 0;
    if (last?.intakeNumber) {
      lastNum = parseInt(last.intakeNumber.split('-')[1]) || 0;
    }
    this.intakeNumber = `STK-${String(lastNum + 1).padStart(6, '0')}`;
  }
});

export const StockIntake = mongoose.model<TStockIntake>('StockIntake', StockIntakeSchema);
