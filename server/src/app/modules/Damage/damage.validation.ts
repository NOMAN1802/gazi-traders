import { z } from "zod";

const damageItemSchema = z.object({
  product: z.string().min(1, "Product ID is required"),
  productName: z.string().min(1, "Product name is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitCost: z.number().min(0, "Unit cost must be a non-negative number"),
  totalLoss: z.number().min(0, "Total loss must be a non-negative number"),
  damageType: z.enum(["expired", "broken", "lost", "defective", "other"]),
  reason: z.string().optional(),
  supplier: z.string().optional(),
  orderItemIndex: z.number().optional(),
});

const createDamageValidationSchema = z.object({
  body: z.object({
    orderId: z.string().optional(),
    orderNumber: z.string().optional(),
    customerId: z.string().optional(),
    items: z.array(damageItemSchema).min(1, "At least one item is required"),
    notes: z.string().optional(),
    subtotal: z.number().min(0, "Subtotal must be a non-negative number"),
    totalLoss: z.number().min(0, "Total loss must be a non-negative number"),
  }),
});

const updateDamageValidationSchema = z.object({
  body: z.object({
    items: z.array(damageItemSchema).min(1, "At least one item is required").optional(),
    notes: z.string().optional(),
    subtotal: z.number().min(0, "Subtotal must be a non-negative number").optional(),
    totalLoss: z.number().min(0, "Total loss must be a non-negative number").optional(),
  }),
});

export const DamageValidations = {
  createDamageValidationSchema,
  updateDamageValidationSchema,
};
