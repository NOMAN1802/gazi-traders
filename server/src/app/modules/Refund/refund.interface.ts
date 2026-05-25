import { Types } from "mongoose";

export type TRefund = {
    _id?: string;
    refundNumber?: string;
    order?: Types.ObjectId;
    orderId?: Types.ObjectId;
    orderNumber?: string;
    amount: number;
    reason?: string;
    paymentMethod?: string;
    isDeleted: boolean;
    customer: {
        name: string;
        phone?: string;
        email?: string;
    };
    notes?: string;
    createdBy: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
};

