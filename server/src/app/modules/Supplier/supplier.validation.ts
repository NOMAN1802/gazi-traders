import { z } from 'zod';

const createSupplierValidationSchema = z.object({
    body: z.object({
        name: z.string({ required_error: 'Name is required' }).min(1),
        contactPerson: z.string({ required_error: 'Contact person is required' }).min(1),
        phone: z.string({ required_error: 'Phone is required' }).min(1),
        address: z.string({ required_error: 'Address is required' }).min(1),
        status: z.enum(['active', 'inactive']).optional(),
    }),
});

const updateSupplierValidationSchema = z.object({
    body: z.object({
        name: z.string().min(1).optional(),
        contactPerson: z.string().min(1).optional(),
        phone: z.string().min(1).optional(),
        address: z.string().min(1).optional(),
        status: z.enum(['active', 'inactive']).optional(),
        isDeleted: z.boolean().optional(),
    }),
});

export const SupplierValidations = {
    createSupplierValidationSchema,
    updateSupplierValidationSchema,
};

