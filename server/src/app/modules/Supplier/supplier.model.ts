import { Schema, model } from 'mongoose';
import { TSupplier } from './supplier.interface';

const SupplierSchema = new Schema<TSupplier>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        address: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

SupplierSchema.index({ name: 1 });
SupplierSchema.index({ phone: 1 });

export const Supplier = model<TSupplier>('Supplier', SupplierSchema);

