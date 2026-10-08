import { z } from 'zod';

export const createOrderSchema = z.object({
  customerId: z
    .string({ required_error: 'customerId is required' })
    .trim()
    .min(1, 'customerId must not be empty'),
  kioskId: z
    .string({ required_error: 'kioskId is required' })
    .trim()
    .min(1, 'kioskId must not be empty'),
  fileUrl: z
    .string({ required_error: 'fileUrl is required' })
    .trim()
    .url('fileUrl must be a valid URL'),
  copies: z
    .number({ required_error: 'copies is required' })
    .int('copies must be an integer')
    .positive('copies must be greater than 0')
    .min(1, 'copies must be at least 1'),
  paperSize: z.enum(['A4', 'A3'], {
    errorMap: () => ({ message: "paperSize must be either 'A4' or 'A3'" }),
  }),
  colorMode: z.enum(['BW', 'COLOR'], {
    errorMap: () => ({ message: "colorMode must be either 'BW' or 'COLOR'" }),
  }),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(
    [
      'CREATED',
      'PAYMENT_PENDING',
      'PAID',
      'PRINTING',
      'COMPLETED',
      'PAYMENT_FAILED',
      'PRINT_FAILED',
      'CANCELLED',
    ],
    {
      errorMap: () => ({ message: 'Invalid order status specified' }),
    },
  ),
  userId: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export const paymentSimulationSchema = z.object({
  success: z.boolean({
    required_error: 'success boolean flag is required',
  }),
  userId: z.string().trim().optional(),
  transactionRef: z.string().trim().optional(),
});

export const printExecutionSchema = z.object({
  userId: z.string().trim().optional(),
  trayNumber: z.string().trim().optional(),
});

export const printFailureSchema = z.object({
  reason: z.string().trim().optional(),
  errorCode: z.string().trim().optional(),
  userId: z.string().trim().optional(),
});

export const orderIdParamSchema = z.object({
  orderId: z
    .string({ required_error: 'orderId parameter is required' })
    .trim()
    .min(1, 'orderId must not be empty'),
});
