import { z } from "zod";

const createExpenseValidationSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required"),
    category: z.enum(["rent", "utilities", "supplies", "salaries", "product_purchase", "refund", "other"], {
      required_error: "Category is required",
    }),
    amount: z.number().min(0, "Amount must be non-negative"),
    date: z.string().datetime().optional(),
    description: z.string().optional(),
    receipt: z.string().optional(),
    referenceId: z.string().optional(),
    referenceModel: z.enum(["Product", "Order", "Return"]).optional(),
  }),
});

const updateExpenseValidationSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    category: z
      .enum(["rent", "utilities", "supplies", "salaries", "product_purchase", "refund", "other"])
      .optional(),
    amount: z.number().min(0).optional(),
    date: z.string().datetime().optional(),
    description: z.string().optional(),
    receipt: z.string().optional(),
    referenceId: z.string().optional(),
    referenceModel: z.enum(["Product", "Order", "Return"]).optional(),
  }),
});

export const ExpenseValidations = {
  createExpenseValidationSchema,
  updateExpenseValidationSchema,
};
