/**
 * Ledger tRPC Router
 * Implements requirements 8.2, 8.3
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import {
  listLedgerEntries,
  getLedgerEntryById,
  getLedgerEntryByInvoiceId,
  exportLedgerToCSV,
} from '@/server/ledger';

// Input validation schemas
const listLedgerSchema = z.object({
  userId: z.string().min(1),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  currency: z.enum(['USD', 'EUR', 'HKD', 'GBP', 'JPY']).optional(),
  paymentMethod: z.enum(['card', 'bank_transfer', 'crypto_usdc', 'crypto_usdt']).optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

const exportLedgerSchema = z.object({
  userId: z.string().min(1),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  currency: z.enum(['USD', 'EUR', 'HKD', 'GBP', 'JPY']).optional(),
  paymentMethod: z.enum(['card', 'bank_transfer', 'crypto_usdc', 'crypto_usdt']).optional(),
});

export const ledgerRouter = router({
  /**
   * List ledger entries with filters
   * _需求: 8.2_
   */
  list: publicProcedure.input(listLedgerSchema).query(async ({ input }) => {
    const { page, pageSize, ...filters } = input;
    return listLedgerEntries(filters, page, pageSize);
  }),

  /**
   * Get a ledger entry by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.string(), userId: z.string() }))
    .query(async ({ input }) => {
      return getLedgerEntryById(input.id, input.userId);
    }),

  /**
   * Get a ledger entry by invoice ID
   */
  getByInvoiceId: publicProcedure
    .input(z.object({ invoiceId: z.string(), userId: z.string() }))
    .query(async ({ input }) => {
      return getLedgerEntryByInvoiceId(input.invoiceId, input.userId);
    }),

  /**
   * Export ledger entries to CSV
   * _需求: 8.3_
   */
  exportCSV: publicProcedure.input(exportLedgerSchema).query(async ({ input }) => {
    const csv = await exportLedgerToCSV(input);
    return { csv };
  }),
});
