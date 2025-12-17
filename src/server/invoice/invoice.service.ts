/**
 * Invoice service
 * Implements requirements 5.4, 5.5, 5.7, 5.8, 5.9, 5.10
 */

import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import type { Invoice, LineItem, Prisma, InvoiceStatus, Currency } from '@prisma/client';
import { calculateInvoice, type LineItemInput } from './calculations';

export interface CreateInvoiceInput {
  userId: string;
  clientId: string;
  projectId?: string;
  currency: Currency;
  issueDate: Date;
  dueDate: Date;
  lineItems: LineItemInput[];
  taxRate?: number | string;
  notes?: string;
  allowCardPayment?: boolean;
  allowCryptoPayment?: boolean;
}

export interface InvoiceFilters {
  userId: string;
  status?: InvoiceStatus;
  clientId?: string;
  projectId?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Generate unique invoice number
 * Format: INV-YYYYMM-XXXX (e.g., INV-202412-0001)
 * _需求: 5.4_
 */
export async function generateInvoiceNumber(userId: string): Promise<string> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `INV-${yearMonth}-`;

  // Find the highest invoice number for this month
  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      userId,
      invoiceNumber: { startsWith: prefix },
    },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  });

  let nextNumber = 1;
  if (lastInvoice) {
    const lastNumber = parseInt(lastInvoice.invoiceNumber.slice(-4), 10);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

/**
 * Generate payment token for invoice
 */
export function generatePaymentToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Create a new invoice
 * _需求: 5.4_ - Initial status is 'draft'
 */
export async function createInvoice(input: CreateInvoiceInput): Promise<Invoice & { lineItems: LineItem[] }> {
  const invoiceNumber = await generateInvoiceNumber(input.userId);
  const calculation = calculateInvoice(input.lineItems, input.taxRate || 0);

  const invoice = await prisma.invoice.create({
    data: {
      userId: input.userId,
      clientId: input.clientId,
      projectId: input.projectId,
      invoiceNumber,
      currency: input.currency,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      subtotal: calculation.subtotal.toFixed(2),
      taxRate: calculation.taxRate.toFixed(4),
      taxAmount: calculation.taxAmount.toFixed(2),
      total: calculation.total.toFixed(2),
      status: 'draft',
      notes: input.notes,
      allowCardPayment: input.allowCardPayment ?? true,
      allowCryptoPayment: input.allowCryptoPayment ?? false,
      lineItems: {
        create: calculation.lineItems.map((item, index) => ({
          description: item.description,
          quantity: item.quantity.toFixed(2),
          unitPrice: item.unitPrice.toFixed(2),
          total: item.total.toFixed(2),
          sortOrder: index,
        })),
      },
    },
    include: { lineItems: true },
  });

  return invoice;
}

/**
 * Get invoice by ID
 */
export async function getInvoiceById(
  id: string,
  userId: string
): Promise<(Invoice & { lineItems: LineItem[] }) | null> {
  return prisma.invoice.findFirst({
    where: { id, userId },
    include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
  });
}

/**
 * Get invoice by payment token (for public payment page)
 */
export async function getInvoiceByPaymentToken(
  token: string
): Promise<(Invoice & { lineItems: LineItem[] }) | null> {
  return prisma.invoice.findFirst({
    where: { paymentToken: token },
    include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
  });
}

/**
 * Send invoice - transition from draft to sent
 * _需求: 5.5_ - Generate paymentToken when sending
 */
export async function sendInvoice(
  id: string,
  userId: string
): Promise<{ success: boolean; paymentToken?: string; error?: string }> {
  const invoice = await getInvoiceById(id, userId);

  if (!invoice) {
    return { success: false, error: 'Invoice not found' };
  }

  if (invoice.status !== 'draft') {
    return { success: false, error: 'Only draft invoices can be sent' };
  }

  const paymentToken = generatePaymentToken();

  await prisma.invoice.update({
    where: { id },
    data: {
      status: 'sent',
      paymentToken,
      sentAt: new Date(),
    },
  });

  return { success: true, paymentToken };
}

/**
 * Mark invoice as paid
 * _需求: 5.7_
 */
export async function markInvoiceAsPaid(
  id: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const invoice = await getInvoiceById(id, userId);

  if (!invoice) {
    return { success: false, error: 'Invoice not found' };
  }

  if (invoice.status === 'paid') {
    return { success: false, error: 'Invoice is already paid' };
  }

  if (invoice.status === 'cancelled') {
    return { success: false, error: 'Cannot mark cancelled invoice as paid' };
  }

  await prisma.invoice.update({
    where: { id },
    data: {
      status: 'paid',
      paidAt: new Date(),
    },
  });

  return { success: true };
}

/**
 * Cancel invoice
 * _需求: 5.9_
 */
export async function cancelInvoice(
  id: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const invoice = await getInvoiceById(id, userId);

  if (!invoice) {
    return { success: false, error: 'Invoice not found' };
  }

  if (invoice.status === 'paid') {
    return { success: false, error: 'Cannot cancel a paid invoice' };
  }

  await prisma.invoice.update({
    where: { id },
    data: {
      status: 'cancelled',
      paymentToken: null, // Disable payment link
    },
  });

  return { success: true };
}

/**
 * Check and update overdue invoices
 * _需求: 5.8_
 */
export async function checkOverdueInvoices(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await prisma.invoice.updateMany({
    where: {
      status: 'sent',
      dueDate: { lt: today },
    },
    data: {
      status: 'overdue',
    },
  });

  return result.count;
}

/**
 * Check if a specific invoice is overdue
 */
export function isInvoiceOverdue(invoice: { status: InvoiceStatus; dueDate: Date }): boolean {
  if (invoice.status !== 'sent') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return invoice.dueDate < today;
}

/**
 * List invoices with filters
 * _需求: 5.10_
 */
export async function listInvoices(filters: InvoiceFilters): Promise<Invoice[]> {
  const where: Prisma.InvoiceWhereInput = {
    userId: filters.userId,
  };

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.clientId) {
    where.clientId = filters.clientId;
  }

  if (filters.projectId) {
    where.projectId = filters.projectId;
  }

  if (filters.startDate || filters.endDate) {
    where.issueDate = {};
    if (filters.startDate) {
      where.issueDate.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.issueDate.lte = filters.endDate;
    }
  }

  return prisma.invoice.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      client: { select: { name: true, email: true } },
      project: { select: { name: true } },
    },
  });
}

/**
 * Filter invoices (pure function for testing)
 */
export function filterInvoices<T extends { status: InvoiceStatus; clientId: string; projectId?: string | null; issueDate: Date }>(
  invoices: T[],
  filters: Omit<InvoiceFilters, 'userId'>
): T[] {
  return invoices.filter((invoice) => {
    if (filters.status && invoice.status !== filters.status) return false;
    if (filters.clientId && invoice.clientId !== filters.clientId) return false;
    if (filters.projectId && invoice.projectId !== filters.projectId) return false;
    if (filters.startDate && invoice.issueDate < filters.startDate) return false;
    if (filters.endDate && invoice.issueDate > filters.endDate) return false;
    return true;
  });
}
