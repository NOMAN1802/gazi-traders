import { Types } from "mongoose";

export type TOrderStatus = "pending" | "completed" | "partial" | "depo_due";

export type TOrderItem = {
  product: Types.ObjectId;
  productName: string;
  categoryId?: Types.ObjectId;
  categoryName?: string;
  unit?: 'Dozen' | 'Cartoon';
  cartoonSize?: number;
  inputQty?: number;
  free?: number;
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
  previousDue?: number;
  paidAmount?: number;
  paymentDate?: Date;
  customerId?: Types.ObjectId;
  status: TOrderStatus;
  paymentMethod?: string;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  isDeleted?: boolean;
};
