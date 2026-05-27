import mongoose, { Schema } from "mongoose";
import { TOrder, TOrderItem } from "./order.interface";

const OrderItemSchema = new Schema<TOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: false },
    categoryName: { type: String, required: false },
    unit: { type: String, enum: ['Dozen', 'Cartoon'], required: false },
    cartoonSize: { type: Number, required: false, min: 0 },
    inputQty: { type: Number, required: false, min: 0 },
    free: { type: Number, required: false, min: 0, default: 0 },
    damageId: { type: Schema.Types.ObjectId, ref: "Damage", required: false },
    returnId: { type: Schema.Types.ObjectId, ref: "Return", required: false },
    damageProducts: { type: Number, default: 0, min: 0 },
    returnProducts: { type: Number, default: 0, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const OrderSchema = new Schema<TOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: {
      name: { type: String, required: true },
      email: { type: String },
      phone: { type: String },
      address: { type: String },
    },
    items: {
      type: [OrderItemSchema],
      required: true,
      validate: [arrayMinLength, "Order must have at least one item"],
    },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    additionalCharges: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    previousDue: { type: Number, default: 0, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    paymentDate: { type: Date },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: false },
    status: {
      type: String,
      enum: ["pending", "completed", "partial"],
      default: "pending",
    },
    paymentMethod: { type: String },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

function arrayMinLength(val: TOrderItem[]) {
  return val.length > 0;
}

// Generate order number before saving
OrderSchema.pre("save", async function (next) {
  if (!this.orderNumber) {
    const lastOrder = await mongoose.model("Order").findOne(
      {},
      { orderNumber: 1 },
      { sort: { createdAt: -1 } }
    );

    let lastNumber = 0;
    if (lastOrder && lastOrder.orderNumber) {
      lastNumber = parseInt(lastOrder.orderNumber.split('-')[1]);
    }

    this.orderNumber = `ORD-${String(lastNumber + 1).padStart(6, "0")}`;
  }
  next();
});

export const Order = mongoose.model<TOrder>("Order", OrderSchema);
