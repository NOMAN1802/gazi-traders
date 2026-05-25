import { z } from 'zod';

const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    sku: z.string().optional(),
    categoryId: z.string().optional(),
    categoryName: z.string().optional(),
    unit: z.string().min(1, 'Unit is required'),
    supplierId: z.string().optional(),
    purchasePrice: z.number().nonnegative().optional(),
    sellingPrice: z.number().nonnegative().optional(),
    stockQuantity: z.number().int().nonnegative().optional(),
    minStockLevel: z.number().int().nonnegative().optional(),
    description: z.string().optional(),
  }),
});

const updateProductSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    sku: z.string().optional(),
    categoryName: z.string().optional(),
    unit: z.string().optional(),
    supplierId: z.string().optional(),
    sellingPrice: z.number().nonnegative().optional(),
    description: z.string().optional(),
  }),
});

export const productValidations = {
  createProductSchema,
  updateProductSchema,
};
