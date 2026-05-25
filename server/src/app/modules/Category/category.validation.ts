import { z } from 'zod';

const createCategoryValidationSchema = z.object({
    body: z.object({
        name: z.string({ required_error: 'Name is required' }).min(1),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
    }),
});

const updateCategoryValidationSchema = z.object({
    body: z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
        isDeleted: z.boolean().optional(),
    }),
});

export const CategoryValidations = {
    createCategoryValidationSchema,
    updateCategoryValidationSchema,
};

