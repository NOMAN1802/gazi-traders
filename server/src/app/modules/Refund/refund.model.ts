import mongoose, { Schema } from "mongoose";
import { TRefund } from "./refund.interface";

const RefundSchema = new Schema<TRefund>(
  {
    refundNumber: { type: String, unique: true },
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: false },
    orderNumber: { type: String },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String },
    paymentMethod: { type: String },
    isDeleted: { type: Boolean, default: false },
    customer: {
      name: { type: String, required: true },
      phone: { type: String },
      email: { type: String },
    },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Generate refund number before saving
RefundSchema.pre("save", async function (next) {
  if (!this.refundNumber) {
    const lastRefund = await mongoose.model("Refund").findOne(
      {},
      { refundNumber: 1 },
      { sort: { createdAt: -1 } }
    );

    let lastNumber = 0;
    if (lastRefund && lastRefund.refundNumber) {
      lastNumber = parseInt(lastRefund.refundNumber.split('-')[1]);
    }

    this.refundNumber = `REF-${String(lastNumber + 1).padStart(6, "0")}`;
  }
  next();
});

export const Refund = mongoose.model<TRefund>("Refund", RefundSchema);

