import { z } from 'zod';

const createUnitValidationSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Unit name is required'),
        abbreviation: z.string().min(1, 'Unit abbreviation is required'),
        description: z.string().optional(),
    }),
});

const updateUnitValidationSchema = z.object({
    body: z.object({
        name: z.string().min(1).optional(),
        abbreviation: z.string().min(1).optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
    }),
});

export const UnitValidations = {
    createUnitValidationSchema,
    updateUnitValidationSchema,
};

