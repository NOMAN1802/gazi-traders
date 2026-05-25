import { z } from "zod";

const createRefundValidationSchema = z.object({
  body: z.object({
    order: z.string().optional(),
    orderId: z.string().optional(),
    orderNumber: z.string().optional(),
    amount: z.number().min(0.01, "Amount must be greater than 0"),
    reason: z.string().optional(),
    paymentMethod: z.string().optional(),
    customer: z.object({
      name: z.string().min(1, "Customer name is required"),
      phone: z.string().optional(),
      email: z.string().optional(),
    }),
    notes: z.string().optional(),
  }),
});

const updateRefundValidationSchema = z.object({
  body: z.object({
    reason: z.string().optional(),
    notes: z.string().optional(),
    paymentMethod: z.string().optional(),
  }),
});

export const RefundValidations = {
  createRefundValidationSchema,
  updateRefundValidationSchema,
};

