import { Types } from 'mongoose';

export type TUnit = {
    _id?: Types.ObjectId;
    name: string;
    abbreviation: string;
    description?: string;
    isActive?: boolean;
    isDeleted?: boolean;
    createdBy?: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
};

