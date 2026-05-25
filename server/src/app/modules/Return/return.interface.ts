import { Types } from "mongoose";

export type TReturnItem = {
  product: Types.ObjectId;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  orderItemIndex?: number;
};

export type TReturn = {
  _id?: string;
  returnNumber?: string;
  order?: Types.ObjectId;
  orderId?: Types.ObjectId;
  orderNumber?: string;
  items: TReturnItem[];
  customer: {
    name: string;
    phone?: string;
    email?: string;
  };
  reason?: string;
  subtotal: number;
  totalAmount: number;
  notes?: string;
  isDeleted: boolean;
  createdBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};
