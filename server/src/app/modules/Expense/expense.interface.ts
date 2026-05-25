import { Types } from "mongoose";

export type TExpenseCategory =
  | "rent"
  | "utilities"
  | "supplies"
  | "salaries"
  | "product_purchase"
  | "refund"
  | "other";

export type TExpense = {
  _id?: string;
  title: string;
  category: TExpenseCategory;
  amount: number;
  date: Date;
  description?: string;
  receipt?: string;
  referenceId?: Types.ObjectId;
  referenceModel?: "Product" | "Order" | "Return";
  supplier?: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};
