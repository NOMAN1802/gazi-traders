import { Types } from "mongoose";

export type TOrderStatus = "pending" | "completed" | "partial";

export type TOrderItem = {
  product: Types.ObjectId;
  productName: string;
  categoryId?: Types.ObjectId;
  categoryName?: string;
  damageId?: Types.ObjectId;
  returnId?: Types.ObjectId;
  damageProducts: number;
  returnProducts: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type TOrder = {
  _id?: string;
  orderNumber: string;
  customer: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  items: TOrderItem[];
  subtotal: number;
  discount?: number;
  tax?: number;
  additionalCharges?: number;
  totalAmount: number;
  paidAmount?: number;
  status: TOrderStatus;
  paymentMethod?: string;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  isDeleted?: boolean;
};
