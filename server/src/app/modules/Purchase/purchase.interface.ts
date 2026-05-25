import { Types } from "mongoose";

export type TPurchaseStatus = "pending" | "completed" | "partial";

export type TPurchaseItem = {
  product: Types.ObjectId;
  productName: string;
  categoryId?: Types.ObjectId;
  categoryName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  markupPercent?: number;
  sellingPrice?: number;
  minStockLevel?: number;
};

export type TPurchase = {
  _id?: string;
  purchaseNumber: string;
  supplier: {
    _id?: Types.ObjectId;
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  items: TPurchaseItem[];
  subtotal: number;
  discount?: number;
  tax?: number;
  additionalCharges?: number;
  totalAmount: number;
  paidAmount?: number;
  status: TPurchaseStatus;
  paymentMethod?: string;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  isDeleted?: boolean;
};

