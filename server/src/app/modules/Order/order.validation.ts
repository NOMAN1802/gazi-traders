import { z } from "zod";

const orderItemSchema = z.object({
  product: z.string().min(1, "Product ID is required"),
  productName: z.string().min(1, "Product name is required"),
  categoryName: z.string().optional(),
  unit: z.enum(['Dozen', 'Cartoon']).optional(),
  cartoonSize: z.number().min(0).optional(),
  inputQty: z.number().min(0).optional(),
  free: z.number().min(0).optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
  totalPrice: z.number().min(0, "Total price must be non-negative"),
});

const createOrderValidationSchema = z.object({
  body: z.object({
    orderNumber: z.string().optional(), // Optional - will be generated server-side
    customer: z.object({
      name: z.string().min(1, "Customer name is required"),
      email: z.string().email().optional().or(z.literal('')),
      phone: z.string().optional(),
      address: z.string().optional(),
    }),
    items: z.array(orderItemSchema).min(1, "Order must have at least one item"),
    subtotal: z.number().min(0, "Subtotal must be non-negative"),
    discount: z.number().min(0).optional(),
    tax: z.number().min(0).optional(),
    additionalCharges: z.number().min(0).optional(),
    totalAmount: z.number().min(0, "Total amount must be non-negative"),
    previousDue: z.number().min(0).optional(),
    paidAmount: z.number().min(0).optional(),
    paymentDate: z.string().optional(),
    customerId: z.string().optional(),
    status: z.enum(["pending", "completed", "partial", "depo_due"]).optional(),
    paymentMethod: z.string().optional(),
    notes: z.string().optional(),
  }),
});

const updateOrderValidationSchema = z.object({
  body: z.object({
    customer: z
      .object({
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
      })
      .optional(),
    status: z.enum(["pending", "completed", "partial", "depo_due"]).optional(),
    paidAmount: z.number().min(0).optional(),
    paymentMethod: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const OrderValidations = {
  createOrderValidationSchema,
  updateOrderValidationSchema,
};
