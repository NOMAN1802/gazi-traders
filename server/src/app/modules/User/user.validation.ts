import { z } from 'zod';

const createUserValidationSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: 'Name is required',
    }),
    role: z.enum(['admin', 'manager', 'staff'], {
      required_error: 'Role is required',
    }),
    email: z.string().email({ message: 'Invalid email' }).optional().or(z.literal('')),
    mobileNumber: z.string({ required_error: 'Mobile number is required' }),
    password: z.string({
      required_error: 'Password is required',
    }),
    status: z.enum(['active', 'inactive']).optional(),
  }),
});

const updateUserValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    role: z.enum(['admin', 'manager', 'staff']).optional(),
    email: z.string().email().optional(),
    mobileNumber: z.string().optional(),
    password: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional(),
  }),
});

const updateCurrentUserValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    mobileNumber: z.string().optional(),
    password: z.string().optional(),
  }),
});

export const UserValidation = {
  createUserValidationSchema,
  updateUserValidationSchema,
  updateCurrentUserValidationSchema,
};