import mongoose, { Schema } from 'mongoose';
import { TUnit } from './unit.interface';

const UnitSchema: Schema = new Schema<TUnit>(
    {
        name: { type: String, required: true, trim: true },
        abbreviation: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

UnitSchema.index({ name: 1 });
UnitSchema.index({ abbreviation: 1 });

export const Unit = mongoose.model<TUnit>('Unit', UnitSchema);

