/**
 * Payment Link Service
 * Handles payment token validation and invoice retrieval for public payment pages
 * _需求: 6.1, 6.6_
 */

import { prisma } from '@/lib/prisma';
import type { Invoice, LineItem, Client } from '@prisma/client';

export interface PaymentPageInvoice {
  id: string;
  invoiceNumber: string;
  currency: string;
  issueDate: Date;
  dueDate: Date;
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  total: string;
  status: string;
  notes: string | null;
  allowCardPayment: boolean;
  allowCryptoPayment: boolean;
  lineItems: Array<{
    id: string;
    description: string;
    quantity: string;
    unitPrice: string;
    total: string;
  }>;
  client: {
    name: string;
    email: string;
    company: string | null;
    country: string | null;
  };
  user: {
    name: string | null;
    email: string;
    settings: {
      businessName: string | null;
      logoUrl: string | null;
    } | null;
  };
}

export type PaymentLinkValidationResult =
  | { valid: true; invoice: PaymentPageInvoice }
  | { valid: false; error: 'not_found' | 'expired' | 'already_paid' | 'cancelled' };

/**
 * Validate a payment token and retrieve the associated invoice
 * _需求: 6.1, 6.6_
 * 
 * @param token - The payment token from the URL
 * @returns Validation result with invoice data or error
 */
export async function validatePaymentToken(token: string): Promise<PaymentLinkValidationResult> {
  if (!token || typeof token !== 'string' || token.length === 0) {
    return { valid: false, error: 'not_found' };
  }

  const invoice = await prisma.invoice.findFirst({
    where: { paymentToken: token },
    include: {
      lineItems: {
        orderBy: { sortOrder: 'asc' },
      },
      client: {
        select: {
          name: true,
          email: true,
          company: true,
          country: true,
        },
      },
      user: {
        select: {
          name: true,
          email: true,
          settings: {
            select: {
              businessName: true,
              logoUrl: true,
            },
          },
        },
      },
    },
  });

  if (!invoice) {
    return { valid: false, error: 'not_found' };
  }

  // Check if invoice is already paid
  if (invoice.status === 'paid') {
    return { valid: false, error: 'already_paid' };
  }

  // Check if invoice is cancelled
  if (invoice.status === 'cancelled') {
    return { valid: false, error: 'cancelled' };
  }

  // Transform to PaymentPageInvoice format
  const paymentPageInvoice: PaymentPageInvoice = {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    currency: invoice.currency,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    subtotal: invoice.subtotal.toString(),
    taxRate: invoice.taxRate.toString(),
    taxAmount: invoice.taxAmount.toString(),
    total: invoice.total.toString(),
    status: invoice.status,
    notes: invoice.notes,
    allowCardPayment: invoice.allowCardPayment,
    allowCryptoPayment: invoice.allowCryptoPayment,
    lineItems: invoice.lineItems.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      total: item.total.toString(),
    })),
    client: invoice.client,
    user: invoice.user,
  };

  return { valid: true, invoice: paymentPageInvoice };
}

/**
 * Check if a payment token exists (lightweight check without full data)
 * Useful for quick validation before loading full page
 */
export async function paymentTokenExists(token: string): Promise<boolean> {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const count = await prisma.invoice.count({
    where: { paymentToken: token },
  });

  return count > 0;
}

/**
 * Get invoice by payment token (pure function for testing)
 * Returns the invoice if the token is valid, null otherwise
 */
export function getInvoiceByToken<T extends { paymentToken: string | null }>(
  invoices: T[],
  token: string
): T | null {
  if (!token || typeof token !== 'string') {
    return null;
  }
  return invoices.find((inv) => inv.paymentToken === token) || null;
}
