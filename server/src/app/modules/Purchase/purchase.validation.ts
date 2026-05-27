import { z } from "zod";

const purchaseItemSchema = z.object({
  product: z.string().min(1, "Product ID is required"),
  productName: z.string().min(1, "Product name is required"),
  categoryName: z.string().optional(),
  unit: z.enum(['Dozen', 'Cartoon']).optional(),
  cartoonSize: z.number().min(0).optional(),
  inputQty: z.number().min(0).optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
  totalPrice: z.number().min(0, "Total price must be non-negative"),
  free: z.number().min(0).optional(),
  markupPercent: z.number().min(0).optional(),
  sellingPrice: z.number().min(0).optional(),
  minStockLevel: z.number().min(0).optional(),
});

const createPurchaseValidationSchema = z.object({
  body: z.object({
    purchaseNumber: z.string().optional(), // Optional - will be generated server-side
    supplier: z.object({
      _id: z.string().optional(),
      name: z.string().min(1, "Supplier name is required"),
      contactPerson: z.string().optional(),
      email: z.string().email().optional().or(z.literal('')),
      phone: z.string().optional(),
      address: z.string().optional(),
    }),
    items: z.array(purchaseItemSchema).min(1, "Purchase must have at least one item"),
    subtotal: z.number().min(0, "Subtotal must be non-negative"),
    discount: z.number().min(0).optional(),
    tax: z.number().min(0).optional(),
    additionalCharges: z.number().min(0).optional(),
    totalAmount: z.number().min(0, "Total amount must be non-negative"),
    previousDue: z.number().min(0).optional(),
    paidAmount: z.number().min(0).optional(),
    paymentDate: z.string().optional(),
    status: z.enum(["pending", "completed", "partial"]).optional(),
    paymentMethod: z.string().optional(),
    notes: z.string().optional(),
  }),
});

const updatePurchaseValidationSchema = z.object({
  body: z.object({
    supplier: z
      .object({
        name: z.string().min(1).optional(),
        contactPerson: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
      })
      .optional(),
    status: z.enum(["pending", "completed", "partial"]).optional(),
    paidAmount: z.number().min(0).optional(),
    paymentMethod: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const PurchaseValidations = {
  createPurchaseValidationSchema,
  updatePurchaseValidationSchema,
};

