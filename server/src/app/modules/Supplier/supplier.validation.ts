import { z } from 'zod';

const createSupplierValidationSchema = z.object({
    body: z.object({
        name: z.string({ required_error: 'Name is required' }).min(1),
        phone: z.string().optional(),
        address: z.string().optional(),
        status: z.enum(['active', 'inactive']).optional(),
    }),
});

const updateSupplierValidationSchema = z.object({
    body: z.object({
        name: z.string().min(1).optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        status: z.enum(['active', 'inactive']).optional(),
        isDeleted: z.boolean().optional(),
    }),
});

export const SupplierValidations = {
    createSupplierValidationSchema,
    updateSupplierValidationSchema,
};

