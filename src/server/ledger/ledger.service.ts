/**
 * Ledger Service
 * Implements requirements 8.1, 8.2, 8.3, 8.4
 */

import { prisma } from '@/lib/prisma';
import type { LedgerEntry, Prisma, Currency, PaymentMethod } from '@prisma/client';
import Decimal from 'decimal.js';

// ============================================
// Types
// ============================================

export interface CreateLedgerEntryInput {
  userId: string;
  invoiceId: string;
  clientId: string;
  projectId?: string | null;
  entryDate: Date;
  amount: Decimal | string;
  currency: Currency;
  paymentMethod: PaymentMethod;
  clientCountry?: string | null;
  metadata?: Record<string, unknown>;
  defaultCurrency?: Currency;
  exchangeRate?: Decimal | number;
}

export interface LedgerFilters {
  userId: string;
  startDate?: Date;
  endDate?: Date;
  clientId?: string;
  projectId?: string;
  currency?: Currency;
  paymentMethod?: PaymentMethod;
}

export interface PaginatedLedgerResult {
  entries: LedgerEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// Exchange Rate Functions
// ============================================

/**
 * Fixed exchange rates to USD (for MVP)
 * TODO: Replace with real-time API in future
 * _需求: 8.4_
 */
const FIXED_EXCHANGE_RATES: Record<Currency, number> = {
  USD: 1.0,
  EUR: 1.08,
  HKD: 0.128,
  GBP: 1.27,
  JPY: 0.0067,
};

/**
 * Get exchange rate between two currencies
 * Returns the rate to convert from sourceCurrency to targetCurrency
 * _需求: 8.4_
 */
export function getExchangeRate(sourceCurrency: Currency, targetCurrency: Currency): Decimal {
  if (sourceCurrency === targetCurrency) {
    return new Decimal(1);
  }
  
  // Convert to USD first, then to target currency
  const sourceToUsd = FIXED_EXCHANGE_RATES[sourceCurrency];
  const targetToUsd = FIXED_EXCHANGE_RATES[targetCurrency];
  
  // rate = sourceToUsd / targetToUsd
  return new Decimal(sourceToUsd).div(targetToUsd);
}

/**
 * Convert amount from one currency to another
 * _需求: 8.4_
 */
export function convertCurrency(
  amount: Decimal,
  sourceCurrency: Currency,
  targetCurrency: Currency
): Decimal {
  const rate = getExchangeRate(sourceCurrency, targetCurrency);
  return amount.mul(rate);
}

/**
 * Pure function to calculate amount in default currency
 * Used for testing Property 19
 * _需求: 8.4_
 */
export function calculateAmountInDefaultCurrency(
  amount: Decimal,
  exchangeRate: Decimal
): Decimal {
  return amount.mul(exchangeRate);
}

// ============================================
// Ledger Entry CRUD
// ============================================

/**
 * Create a ledger entry
 * Called automatically when payment succeeds
 * _需求: 8.1_
 */
export async function createLedgerEntry(input: CreateLedgerEntryInput): Promise<LedgerEntry> {
  const amount = typeof input.amount === 'string' 
    ? new Decimal(input.amount) 
    : input.amount;

  // Calculate amount in default currency
  let amountInDefaultCurrency: Decimal;
  
  if (input.exchangeRate !== undefined) {
    // Use provided exchange rate
    const rate = typeof input.exchangeRate === 'number' 
      ? new Decimal(input.exchangeRate) 
      : input.exchangeRate;
    amountInDefaultCurrency = calculateAmountInDefaultCurrency(amount, rate);
  } else if (input.defaultCurrency && input.defaultCurrency !== input.currency) {
    // Calculate using fixed rates
    amountInDefaultCurrency = convertCurrency(amount, input.currency, input.defaultCurrency);
  } else {
    // Same currency, no conversion needed
    amountInDefaultCurrency = amount;
  }

  return prisma.ledgerEntry.create({
    data: {
      userId: input.userId,
      invoiceId: input.invoiceId,
      clientId: input.clientId,
      projectId: input.projectId,
      entryDate: input.entryDate,
      amount: amount.toFixed(2),
      currency: input.currency,
      amountInDefaultCurrency: amountInDefaultCurrency.toFixed(2),
      paymentMethod: input.paymentMethod,
      clientCountry: input.clientCountry,
      metadata: (input.metadata || {}) as Prisma.InputJsonValue,
    },
  });
}

/**
 * Get ledger entry by ID
 */
export async function getLedgerEntryById(
  id: string,
  userId: string
): Promise<LedgerEntry | null> {
  return prisma.ledgerEntry.findFirst({
    where: { id, userId },
  });
}

/**
 * Get ledger entry by invoice ID
 */
export async function getLedgerEntryByInvoiceId(
  invoiceId: string,
  userId: string
): Promise<LedgerEntry | null> {
  return prisma.ledgerEntry.findFirst({
    where: { invoiceId, userId },
  });
}

// ============================================
// Ledger Filtering
// ============================================

/**
 * List ledger entries with filters
 * _需求: 8.2_
 */
export async function listLedgerEntries(
  filters: LedgerFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedLedgerResult> {
  const where = buildLedgerWhereClause(filters);

  const [entries, total] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where,
      orderBy: { entryDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        client: { select: { name: true, email: true } },
        project: { select: { name: true } },
        invoice: { select: { invoiceNumber: true } },
      },
    }),
    prisma.ledgerEntry.count({ where }),
  ]);

  return {
    entries,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Build Prisma where clause from filters
 */
function buildLedgerWhereClause(filters: LedgerFilters): Prisma.LedgerEntryWhereInput {
  const where: Prisma.LedgerEntryWhereInput = {
    userId: filters.userId,
  };

  if (filters.clientId) {
    where.clientId = filters.clientId;
  }

  if (filters.projectId) {
    where.projectId = filters.projectId;
  }

  if (filters.currency) {
    where.currency = filters.currency;
  }

  if (filters.paymentMethod) {
    where.paymentMethod = filters.paymentMethod;
  }

  if (filters.startDate || filters.endDate) {
    where.entryDate = {};
    if (filters.startDate) {
      where.entryDate.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.entryDate.lte = filters.endDate;
    }
  }

  return where;
}

/**
 * Pure function to filter ledger entries
 * Used for testing Property 18
 * _需求: 8.2_
 */
export function filterLedgerEntries<T extends {
  userId: string;
  clientId: string;
  projectId?: string | null;
  currency: Currency;
  paymentMethod: PaymentMethod;
  entryDate: Date;
}>(
  entries: T[],
  filters: LedgerFilters
): T[] {
  return entries.filter((entry) => {
    // User ID must match
    if (entry.userId !== filters.userId) return false;
    
    // Client filter
    if (filters.clientId && entry.clientId !== filters.clientId) return false;
    
    // Project filter
    if (filters.projectId && entry.projectId !== filters.projectId) return false;
    
    // Currency filter
    if (filters.currency && entry.currency !== filters.currency) return false;
    
    // Payment method filter
    if (filters.paymentMethod && entry.paymentMethod !== filters.paymentMethod) return false;
    
    // Date range filter
    if (filters.startDate && entry.entryDate < filters.startDate) return false;
    if (filters.endDate && entry.entryDate > filters.endDate) return false;
    
    return true;
  });
}

// ============================================
// CSV Export
// ============================================

/**
 * Export ledger entries to CSV format
 * _需求: 8.3_
 */
export async function exportLedgerToCSV(filters: LedgerFilters): Promise<string> {
  const where = buildLedgerWhereClause(filters);

  const entries = await prisma.ledgerEntry.findMany({
    where,
    orderBy: { entryDate: 'desc' },
    include: {
      client: { select: { name: true, email: true } },
      project: { select: { name: true } },
      invoice: { select: { invoiceNumber: true } },
    },
  });

  return generateCSV(entries);
}

/**
 * Generate CSV string from ledger entries
 * Pure function for testing
 */
export function generateCSV(
  entries: Array<{
    id: string;
    entryDate: Date;
    amount: Prisma.Decimal | string;
    currency: Currency;
    amountInDefaultCurrency: Prisma.Decimal | string;
    paymentMethod: PaymentMethod;
    clientCountry: string | null;
    client?: { name: string; email: string } | null;
    project?: { name: string } | null;
    invoice?: { invoiceNumber: string } | null;
  }>
): string {
  const headers = [
    'Date',
    'Invoice Number',
    'Client Name',
    'Client Email',
    'Project',
    'Amount',
    'Currency',
    'Amount (Default Currency)',
    'Payment Method',
    'Client Country',
  ];

  const rows = entries.map((entry) => [
    formatDate(entry.entryDate),
    entry.invoice?.invoiceNumber || '',
    entry.client?.name || '',
    entry.client?.email || '',
    entry.project?.name || '',
    entry.amount.toString(),
    entry.currency,
    entry.amountInDefaultCurrency.toString(),
    formatPaymentMethod(entry.paymentMethod),
    entry.clientCountry || '',
  ]);

  return [
    headers.join(','),
    ...rows.map((row) => row.map(escapeCSVField).join(',')),
  ].join('\n');
}

/**
 * Format date for CSV export
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format payment method for display
 */
function formatPaymentMethod(method: PaymentMethod): string {
  const methodNames: Record<PaymentMethod, string> = {
    card: 'Card',
    bank_transfer: 'Bank Transfer',
    crypto_usdc: 'Crypto (USDC)',
    crypto_usdt: 'Crypto (USDT)',
  };
  return methodNames[method] || method;
}

/**
 * Escape CSV field to handle special characters
 */
function escapeCSVField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
