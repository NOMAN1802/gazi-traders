import { Types } from "mongoose";

export type TDamageType = "expired" | "broken" | "lost" | "defective" | "other";

export type TDamageItem = {
  product: Types.ObjectId;
  productName: string;
  quantity: number;
  unitCost: number;
  totalLoss: number;
  damageType: TDamageType;
  reason?: string;
  supplier?: Types.ObjectId;
  orderItemIndex?: number;
  supplierName?: string;
};

export type TDamage = {
  _id?: string;
  damageNumber?: string;
  orderId?: Types.ObjectId;
  orderNumber?: string;
  customerId?: Types.ObjectId;
  items: TDamageItem[];
  notes?: string;
  subtotal: number;
  totalLoss: number;
  isDeleted?: boolean;
  createdBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};
