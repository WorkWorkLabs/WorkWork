import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import {
  createInvoice,
  createInvoiceWithNewClient,
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

// New client info schema (for creating client inline)
const newClientSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  company: z.string().max(200).optional(),
  country: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
});

const createInvoiceSchema = z.object({
  userId: z.string().min(1),
  // Either clientId OR newClient must be provided
  clientId: z.string().optional(),
  newClient: newClientSchema.optional(),
  projectId: z.string().optional(),
  currency: z.enum(['USD', 'EUR', 'HKD', 'GBP', 'JPY']),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  lineItems: z.array(lineItemSchema).min(1),
  taxRate: z.union([z.number(), z.string()]).optional(),
  notes: z.string().max(1000).optional(),
  allowCardPayment: z.boolean().optional(),
  allowCryptoPayment: z.boolean().optional(),
}).refine(
  (data) => data.clientId || data.newClient,
  { message: 'Either clientId or newClient must be provided' }
);

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
   * Supports both existing client (clientId) and new client (newClient)
   * If newClient is provided, creates the client first then creates the invoice
   * _需求: 5.4_
   */
  create: publicProcedure.input(createInvoiceSchema).mutation(async ({ input }) => {
    if (input.newClient) {
      // Create invoice with new client
      return createInvoiceWithNewClient({
        userId: input.userId,
        newClient: input.newClient,
        projectId: input.projectId,
        currency: input.currency,
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        lineItems: input.lineItems,
        taxRate: input.taxRate,
        notes: input.notes,
        allowCardPayment: input.allowCardPayment,
        allowCryptoPayment: input.allowCryptoPayment,
      });
    }
    // Use existing client
    return createInvoice({
      ...input,
      clientId: input.clientId!,
    });
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
