import { Types } from 'mongoose';

export type TProduct = {
  _id?: Types.ObjectId;
  name: string;
  sku?: string;
  category?: Types.ObjectId;
  categoryId?: string;
  categoryName?: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minStockLevel?: number;
  description?: string;
  supplierId?: string;
  createdBy?: Types.ObjectId;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};
