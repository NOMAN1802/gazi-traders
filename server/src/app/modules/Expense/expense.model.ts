import mongoose, { Schema } from "mongoose";
import { TExpense } from "./expense.interface";

const ExpenseSchema = new Schema<TExpense>(
  {
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ["rent", "utilities", "supplies", "salaries", "product_purchase", "refund", "other"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, default: Date.now },
    description: { type: String },
    receipt: { type: String },
    referenceId: { type: Schema.Types.ObjectId, refPath: "referenceModel" },
    referenceModel: { type: String, enum: ["Product", "Order", "Return", "Purchase"] },
    supplier: { type: Schema.Types.ObjectId, ref: "Supplier" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const Expense = mongoose.model<TExpense>("Expense", ExpenseSchema);
