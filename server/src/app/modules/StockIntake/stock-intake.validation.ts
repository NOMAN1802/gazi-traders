import { z } from 'zod';

const stockIntakeItemSchema = z.object({
  product: z.string().min(1),
  productName: z.string().min(1),
  categoryName: z.string().optional(),
  unit: z.enum(['Dozen', 'Cartoon']).optional(),
  cartoonSize: z.number().min(0).optional(),
  orderedQty: z.number().min(0),
  receivedQty: z.number().min(0),
  pendingQty: z.number().min(0),
  orderedPieces: z.number().min(0),
  receivedPieces: z.number().min(0),
  pendingPieces: z.number().min(0),
});

const createStockIntakeSchema = z.object({
  body: z.object({
    items: z.array(stockIntakeItemSchema).min(1),
    notes: z.string().optional(),
  }),
});

export const StockIntakeValidations = { createStockIntakeSchema };
