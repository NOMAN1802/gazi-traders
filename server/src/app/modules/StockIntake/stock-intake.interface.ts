import { Types } from 'mongoose';

export type TStockIntakeStatus = 'complete' | 'partial';

export type TStockIntakeItem = {
  product: Types.ObjectId;
  productName: string;
  categoryName?: string;
  unit?: 'Dozen' | 'Cartoon';
  cartoonSize?: number;
  orderedQty: number;
  receivedQty: number;
  pendingQty: number;
  orderedPieces: number;
  receivedPieces: number;
  pendingPieces: number;
};

export type TStockIntake = {
  _id?: string;
  intakeNumber: string;
  items: TStockIntakeItem[];
  notes?: string;
  status: TStockIntakeStatus;
  createdBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  isDeleted?: boolean;
};
