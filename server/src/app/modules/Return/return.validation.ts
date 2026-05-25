import { z } from "zod";

const returnItemSchema = z.object({
  product: z.string().min(1, "Product ID is required"),
  productName: z.string().min(1, "Product name is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
  totalPrice: z.number().min(0, "Total price must be non-negative"),
  orderItemIndex: z.number().int().optional(),
});

const createReturnValidationSchema = z.object({
  body: z.object({
    returnNumber: z.string().optional(), // Optional - will be generated server-side
    order: z.string().optional(),
    orderNumber: z.string().optional(),
    orderId: z.string().optional(),
    items: z.array(returnItemSchema).min(1, "Return must have at least one item"),
    customer: z.object({
      name: z.string().min(1, "Customer name is required"),
      phone: z.string().optional().or(z.literal('')),
      email: z.string().optional(),
    }),
    reason: z.string().optional(),
    subtotal: z.number().min(0, "Subtotal must be non-negative"),
    totalAmount: z.number().min(0, "Total amount must be non-negative"),
    notes: z.string().optional().or(z.literal('')),
  }),
});

const updateReturnValidationSchema = z.object({
  body: z.object({
    reason: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const ReturnValidations = {
  createReturnValidationSchema,
  updateReturnValidationSchema,
};
