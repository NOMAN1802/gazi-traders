import { Types } from 'mongoose';

export type TProduct = {
  _id?: Types.ObjectId;
  name: string;
  sku?: string;
  category?: Types.ObjectId;
  categoryId?: string;
  categoryName?: string;
  unit: 'Dozen' | 'Cartoon';
  cartoonSize?: number;
  purchasePrice?: number;
  sellingPrice: number;
  stockQuantity: number;
  free?: number;
  minStockLevel?: number;
  description?: string;
  supplierId?: string;
  createdBy?: Types.ObjectId;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};
