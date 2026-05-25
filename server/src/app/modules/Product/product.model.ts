import mongoose, { Schema, Document } from 'mongoose';
import { TProduct } from './product.interface';

const ProductSchema: Schema = new Schema<TProduct>(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, unique: true, sparse: true, trim: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: false },
    categoryName: { type: String, required: false },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    purchasePrice: { type: Number, required: false, default: 0, min: 0 },
    sellingPrice: { type: Number, required: false, default: 0, min: 0 },
    stockQuantity: { type: Number, required: false, default: 0, min: 0 },
    minStockLevel: { type: Number, default: 0, min: 0 },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: false },
    description: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ProductSchema.index({ name: 1 });
ProductSchema.index({ sku: 1 }, { unique: true, sparse: true });

export const Product = mongoose.model<TProduct & Document>('Product', ProductSchema);
