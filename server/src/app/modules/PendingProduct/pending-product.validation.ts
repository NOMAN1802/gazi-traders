import { z } from 'zod';

const createPendingProductsSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          productName: z.string().min(1, 'Product name is required'),
          code: z.string().optional(),
          quantity: z.number().min(1, 'Quantity must be at least 1'),
          amount: z.number().min(0, 'Amount must be non-negative'),
          supplierName: z.string().optional(),
        })
      )
      .min(1, 'At least one item is required'),
  }),
});

const updatePendingProductSchema = z.object({
  body: z.object({
    status: z.enum(['pending', 'partial_received', 'received']).optional(),
    receivedQuantity: z.number().min(0).optional(),
    notes: z.string().optional(),
  }),
});

export const PendingProductValidations = {
  createPendingProductsSchema,
  updatePendingProductSchema,
};
