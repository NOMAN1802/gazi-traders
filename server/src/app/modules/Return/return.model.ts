import mongoose, { Schema } from "mongoose";
import { TReturn, TReturnItem } from "./return.interface";

const ReturnItemSchema = new Schema<TReturnItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    orderItemIndex: { type: Number, required: false },
  },
  { _id: false }
);

const ReturnSchema = new Schema<TReturn>(
  {
    returnNumber: { type: String, unique: true },
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: false },
    orderNumber: { type: String },
    items: {
      type: [ReturnItemSchema],
      required: true,
      validate: {
        validator: (val: TReturnItem[]) => val.length > 0,
        message: "Return must have at least one item",
      },
    },
    customer: {
      name: { type: String, required: true },
      phone: { type: String },
      email: { type: String },
    },
    reason: { type: String },
    subtotal: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    notes: { type: String },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Generate return number before saving
ReturnSchema.pre("save", async function (next) {
  const doc = this as mongoose.Document & TReturn;
  if (!doc.returnNumber) {
    const lastReturn = await mongoose.model("Return").findOne(
      {},
      { returnNumber: 1 },
      { sort: { createdAt: -1 } }
    );

    let lastNumber = 0;
    if (lastReturn && 'returnNumber' in lastReturn && lastReturn.returnNumber) {
      lastNumber = parseInt(lastReturn.returnNumber.split('-')[1]);
    }

    doc.returnNumber = `RET-${String(lastNumber + 1).padStart(6, "0")}`;
  }
  next();
});

export const Return = mongoose.model<TReturn>("Return", ReturnSchema);
