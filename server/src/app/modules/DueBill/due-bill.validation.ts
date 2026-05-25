import { z } from 'zod';

const createDueBillValidationSchema = z.object({
  body: z.object({
    customerId: z.string().optional(),
    customer: z.object({
      name: z.string().min(1, 'Customer name is required'),
      phone: z.string().optional().or(z.literal('')),
      email: z.string().optional().or(z.literal('')),
      address: z.string().optional().or(z.literal('')),
    }),
    partyName: z.string().min(1, 'Party name is required'),
    amount: z.number().min(0.01, 'Amount must be greater than 0'),
    notes: z.string().optional().or(z.literal('')),
  }),
});

const updateDueBillValidationSchema = z.object({
  body: z.object({
    customerId: z.string().optional(),
    customer: z
      .object({
        name: z.string().min(1).optional(),
        phone: z.string().optional().or(z.literal('')),
        email: z.string().optional().or(z.literal('')),
        address: z.string().optional().or(z.literal('')),
      })
      .optional(),
    partyName: z.string().min(1).optional(),
    amount: z.number().min(0.01).optional(),
    notes: z.string().optional().or(z.literal('')),
  }),
});

const payDueBillValidationSchema = z.object({
  body: z.object({
    amount: z.number().min(0.01, 'Payment amount must be greater than 0'),
    paymentMethod: z
      .enum(['cash', 'bank_transfer', 'mobile_banking', 'cheque', 'other'])
      .default('cash'),
    notes: z.string().optional().or(z.literal('')),
  }),
});

export const DueBillValidations = {
  createDueBillValidationSchema,
  updateDueBillValidationSchema,
  payDueBillValidationSchema,
};
