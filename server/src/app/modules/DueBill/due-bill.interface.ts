import { Types } from 'mongoose';

export type TDueBillPayment = {
  _id?: Types.ObjectId;
  amount: number;
  date: Date;
  paymentMethod: 'cash' | 'bank_transfer' | 'mobile_banking' | 'cheque' | 'other';
  notes?: string;
};

export type TDueBill = {
  _id?: string;
  dueBillNumber?: string;
  customerId?: Types.ObjectId;
  customer: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  partyName: string;
  amount: number;
  paidAmount: number;
  payments: TDueBillPayment[];
  status: 'pending' | 'partial' | 'paid';
  notes?: string;
  isDeleted: boolean;
  createdBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};
