import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import {
  createInvoice,
  getInvoiceById,
  getInvoiceByPaymentToken,
  sendInvoice,
  markInvoiceAsPaid,
  cancelInvoice,
  listInvoices,
} from '@/server/invoice';

// Input validation schemas
const lineItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.union([z.number(), z.string()]).transform((v) => String(v)),
  unitPrice: z.union([z.number(), z.string()]).transform((v) => String(v)),
});

const createInvoiceSchema = z.object({
  userId: z.string().min(1),
  clientId: z.string().min(1),
  projectId: z.string().optional(),
  currency: z.enum(['USD', 'EUR', 'CNY', 'GBP', 'JPY']),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  lineItems: z.array(lineItemSchema).min(1),
  taxRate: z.union([z.number(), z.string()]).optional(),
  notes: z.string().max(1000).optional(),
  allowCardPayment: z.boolean().optional(),
  allowCryptoPayment: z.boolean().optional(),
});

const listInvoicesSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).optional(),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const invoiceRouter = router({
  /**
   * Create a new invoice
   * _需求: 5.4_
   */
  create: publicProcedure.input(createInvoiceSchema).mutation(async ({ input }) => {
    return createInvoice(input);
  }),

  /**
   * Get invoice by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.string(), userId: z.string() }))
    .query(async ({ input }) => {
      return getInvoiceById(input.id, input.userId);
    }),

  /**
   * Get invoice by payment token (public)
   */
  getByPaymentToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      return getInvoiceByPaymentToken(input.token);
    }),

  /**
   * Send invoice
   * _需求: 5.5_
   */
  send: publicProcedure
    .input(z.object({ id: z.string(), userId: z.string() }))
    .mutation(async ({ input }) => {
      return sendInvoice(input.id, input.userId);
    }),

  /**
   * Mark invoice as paid
   * _需求: 5.7_
   */
  markAsPaid: publicProcedure
    .input(z.object({ id: z.string(), userId: z.string() }))
    .mutation(async ({ input }) => {
      return markInvoiceAsPaid(input.id, input.userId);
    }),

  /**
   * Cancel invoice
   * _需求: 5.9_
   */
  cancel: publicProcedure
    .input(z.object({ id: z.string(), userId: z.string() }))
    .mutation(async ({ input }) => {
      return cancelInvoice(input.id, input.userId);
    }),

  /**
   * List invoices with filters
   * _需求: 5.10_
   */
  list: publicProcedure.input(listInvoicesSchema).query(async ({ input }) => {
    return listInvoices(input);
  }),
});
