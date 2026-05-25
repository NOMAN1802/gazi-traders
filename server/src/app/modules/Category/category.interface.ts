import { Types } from 'mongoose';

export type TCategory = {
    _id?: Types.ObjectId;
    name: string;
    description?: string;
    isActive?: boolean;
    isDeleted?: boolean;
    createdBy?: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
};

