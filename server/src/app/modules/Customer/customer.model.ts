import { Schema, model } from 'mongoose';
import { TCustomer } from './customer.interface';

const CustomerSchema = new Schema<TCustomer>(
    {
        name: { type: String, required: true, trim: true },
        phone: { type: String, trim: true },
        address: { type: String, trim: true },
        status: { type: String, enum: ['active', 'inactive'], default: 'active' },
        isDeleted: { type: Boolean, default: false },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

CustomerSchema.index({ name: 1 });
CustomerSchema.index({ phone: 1 });

export const Customer = model<TCustomer>('Customer', CustomerSchema);
