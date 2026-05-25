import mongoose, { Schema } from "mongoose";
import { TDamage, TDamageItem } from "./damage.interface";

const DamageItemSchema = new Schema<TDamageItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true, min: 0 },
    totalLoss: { type: Number, required: true, min: 0 },
    damageType: {
      type: String,
      enum: ["expired", "broken", "lost", "defective", "other"],
      required: true,
    },
    reason: { type: String },
    supplier: { type: Schema.Types.ObjectId, ref: "Supplier", required: false },
    orderItemIndex: { type: Number, required: false },
    supplierName: { type: String },
  },
  { _id: false }
);

const DamageSchema = new Schema<TDamage>(
  {
    damageNumber: { type: String, unique: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: false },
    orderNumber: { type: String },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: false },
    items: {
      type: [DamageItemSchema],
      required: true,
      validate: {
        validator: (val: TDamageItem[]) => val.length > 0,
        message: "Damage must have at least one item",
      },
    },
    notes: { type: String },
    subtotal: { type: Number, required: true, min: 0 },
    totalLoss: { type: Number, required: true, min: 0 },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Generate damage number before saving
DamageSchema.pre("save", async function (next) {
  const doc = this as mongoose.Document & TDamage;
  if (!doc.damageNumber) {
    const lastDamage = await mongoose.model("Damage").findOne(
      {},
      { damageNumber: 1 },
      { sort: { createdAt: -1 } }
    );
    
    let nextNumber = 1;
    if (lastDamage && 'damageNumber' in lastDamage && lastDamage.damageNumber) {
      const match = lastDamage.damageNumber.match(/DMG-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    
    doc.damageNumber = `DMG-${String(nextNumber).padStart(6, "0")}`;
  }

  // Calculate subtotal and totalLoss from items
  if (doc.items && doc.items.length > 0) {
    doc.subtotal = doc.items.reduce((sum: number, item: TDamageItem) => sum + (item.totalLoss || 0), 0);
    doc.totalLoss = doc.subtotal;
  }

  next();
});

export const Damage = mongoose.model<TDamage>("Damage", DamageSchema);
