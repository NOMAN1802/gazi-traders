import { Types } from 'mongoose';

export type TCustomer = {
    _id?: Types.ObjectId;
    name: string;
    phone?: string;
    address?: string;
    status: 'active' | 'inactive';
    isDeleted?: boolean;
    createdBy?: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
};
