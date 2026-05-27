import mongoose, { Schema } from "mongoose";
import { TPurchase, TPurchaseItem } from "./purchase.interface";

const PurchaseItemSchema = new Schema<TPurchaseItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: false },
    categoryName: { type: String, required: false },
    unit: { type: String, enum: ['Dozen', 'Cartoon'], required: false },
    cartoonSize: { type: Number, required: false, min: 0 },
    inputQty: { type: Number, required: false, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    free: { type: Number, required: false, min: 0, default: 0 },
    markupPercent: { type: Number, required: false, min: 0 },
    sellingPrice: { type: Number, required: false, min: 0 },
    minStockLevel: { type: Number, required: false, min: 0 },
  },
  { _id: false }
);

const PurchaseSchema = new Schema<TPurchase>(
  {
    purchaseNumber: { type: String, required: true, unique: true },
    supplier: {
      _id: { type: Schema.Types.ObjectId, ref: "Supplier", required: false },
      name: { type: String, required: true },
      contactPerson: { type: String },
      email: { type: String },
      phone: { type: String },
      address: { type: String },
    },
    items: {
      type: [PurchaseItemSchema],
      required: true,
      validate: [arrayMinLength, "Purchase must have at least one item"],
    },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    additionalCharges: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    previousDue: { type: Number, default: 0, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    paymentDate: { type: Date },
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

function arrayMinLength(val: TPurchaseItem[]) {
  return val.length > 0;
}

// Generate purchase number before saving
PurchaseSchema.pre("save", async function (next) {
  if (!this.purchaseNumber) {
    const lastPurchase = await mongoose.model("Purchase").findOne(
      {},
      { purchaseNumber: 1 },
      { sort: { createdAt: -1 } }
    );

    let lastNumber = 0;
    if (lastPurchase && lastPurchase.purchaseNumber) {
      lastNumber = parseInt(lastPurchase.purchaseNumber.split('-')[1]);
    }

    this.purchaseNumber = `PUR-${String(lastNumber + 1).padStart(6, "0")}`;
  }
  next();
});

export const Purchase = mongoose.model<TPurchase>("Purchase", PurchaseSchema);

