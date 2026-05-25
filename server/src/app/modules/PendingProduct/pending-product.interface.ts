import { Types } from 'mongoose';

export type TPendingProductStatus = 'pending' | 'partial_received' | 'received';

export type TPartialReceive = {
  quantity: number;
  amount: number;
  date: Date;
};

export type TPendingProduct = {
  _id?: Types.ObjectId;
  productName: string;
  code?: string;
  quantity: number;
  amount: number;
  supplierName?: string;
  status: TPendingProductStatus;
  receivedQuantity?: number;
  receivedAmount?: number;
  partialReceives?: TPartialReceive[];
  notes?: string;
  createdBy?: Types.ObjectId;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};
