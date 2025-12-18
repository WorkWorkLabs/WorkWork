/**
 * Webhook Event Handlers
 * Handles payment success and failure events
 * _需求: 5.7, 6.4, 6.7, 8.1_
 */

import { prisma } from '@/lib/prisma';
import type { PaymentMethod, Currency } from '@prisma/client';
import Decimal from 'decimal.js';

/**
 * Payment success details from PSP
 */
export interface PaymentSuccessDetails {
  pspProvider: string;
  pspPaymentId?: string;
  checkoutSessionId?: string;
  amount?: number;
  currency?: string;
}

/**
 * Payment failure details
 */
export interface PaymentFailureDetails {
  eventType: string;
  pspProvider: string;
  errorMessage?: string;
}

/**
 * Result of payment handling
 */
export interface PaymentHandlerResult {
  success: boolean;
  invoiceId: string;
  error?: string;
  ledgerEntryId?: string;
}

/**
 * Handle successful payment
 * Updates invoice status to 'paid' and creates ledger entry
 * _需求: 5.7, 6.4, 8.1_
 */
export async function handlePaymentSuccess(
  invoiceId: string,
  details: PaymentSuccessDetails
): Promise<PaymentHandlerResult> {
  try {
    // Get invoice with client info
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: true,
        payment: true,
      },
    });

    if (!invoice) {
      console.error(`[Payment Handler] Invoice not found: ${invoiceId}`);
      return {
        success: false,
        invoiceId,
        error: 'Invoice not found',
      };
    }

    // Check if invoice is already paid
    if (invoice.status === 'paid') {
      console.log(`[Payment Handler] Invoice ${invoiceId} already paid, skipping`);
      return {
        success: true,
        invoiceId,
        ledgerEntryId: undefined,
      };
    }

    // Check if invoice can be paid (not cancelled)
    if (invoice.status === 'cancelled') {
      console.error(`[Payment Handler] Cannot pay cancelled invoice: ${invoiceId}`);
      return {
        success: false,
        invoiceId,
        error: 'Invoice is cancelled',
      };
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();

      // Update invoice status to paid
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'paid',
          paidAt: now,
        },
      });

      // Create or update payment record
      const paymentData = {
        type: 'fiat' as const,
        amount: invoice.total,
        currency: invoice.currency,
        status: 'succeeded' as const,
        completedAt: now,
        metadata: {
          pspProvider: details.pspProvider,
          pspPaymentId: details.pspPaymentId,
          checkoutSessionId: details.checkoutSessionId,
        },
      };

      let payment;
      if (invoice.payment) {
        payment = await tx.payment.update({
          where: { id: invoice.payment.id },
          data: paymentData,
        });
      } else {
        payment = await tx.payment.create({
          data: {
            invoiceId,
            ...paymentData,
          },
        });
      }

      // Create or update fiat payment details
      const existingFiatPayment = await tx.fiatPayment.findUnique({
        where: { paymentId: payment.id },
      });

      if (!existingFiatPayment) {
        await tx.fiatPayment.create({
          data: {
            paymentId: payment.id,
            pspProvider: details.pspProvider,
            pspPaymentId: details.pspPaymentId,
            checkoutSessionId: details.checkoutSessionId,
          },
        });
      }

      // Create ledger entry
      // _需求: 8.1_ - Auto-create ledger entry when invoice is paid
      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          userId: invoice.userId,
          invoiceId: invoice.id,
          clientId: invoice.clientId,
          projectId: invoice.projectId,
          entryDate: now,
          amount: invoice.total,
          currency: invoice.currency,
          amountInDefaultCurrency: invoice.total, // TODO: Apply exchange rate conversion
          paymentMethod: 'card' as PaymentMethod,
          clientCountry: invoice.client.country,
          metadata: {
            pspProvider: details.pspProvider,
            pspPaymentId: details.pspPaymentId,
            invoiceNumber: invoice.invoiceNumber,
          },
        },
      });

      return { ledgerEntryId: ledgerEntry.id };
    });

    console.log(`[Payment Handler] Successfully processed payment for invoice ${invoiceId}`);
    return {
      success: true,
      invoiceId,
      ledgerEntryId: result.ledgerEntryId,
    };
  } catch (error) {
    console.error(`[Payment Handler] Error processing payment for invoice ${invoiceId}:`, error);
    return {
      success: false,
      invoiceId,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle failed payment
 * Logs error and keeps invoice status unchanged
 * _需求: 6.7_
 */
export async function handlePaymentFailure(
  invoiceId: string,
  details: PaymentFailureDetails
): Promise<PaymentHandlerResult> {
  try {
    // Get invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payment: true },
    });

    if (!invoice) {
      console.error(`[Payment Handler] Invoice not found: ${invoiceId}`);
      return {
        success: false,
        invoiceId,
        error: 'Invoice not found',
      };
    }

    // Log the failure but don't change invoice status
    // _需求: 6.7_ - Keep invoice status unchanged on payment failure
    console.log(
      `[Payment Handler] Payment failed for invoice ${invoiceId}: ${details.errorMessage || details.eventType}`
    );

    // Update payment record if exists (to track the failure)
    if (invoice.payment) {
      await prisma.payment.update({
        where: { id: invoice.payment.id },
        data: {
          status: 'failed',
          metadata: {
            ...(invoice.payment.metadata as object || {}),
            lastFailure: {
              eventType: details.eventType,
              errorMessage: details.errorMessage,
              timestamp: new Date().toISOString(),
            },
          },
        },
      });
    }

    // Invoice status remains unchanged per requirement 6.7
    return {
      success: true,
      invoiceId,
    };
  } catch (error) {
    console.error(`[Payment Handler] Error handling payment failure for invoice ${invoiceId}:`, error);
    return {
      success: false,
      invoiceId,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Pure function to determine payment method from payment details
 * Used for testing
 */
export function determinePaymentMethod(
  paymentType: 'fiat' | 'crypto',
  cryptoAsset?: 'USDC' | 'USDT'
): PaymentMethod {
  if (paymentType === 'crypto') {
    return cryptoAsset === 'USDT' ? 'crypto_usdt' : 'crypto_usdc';
  }
  return 'card';
}

/**
 * Invoice status type for pure function testing
 */
export type InvoiceStatusType = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

/**
 * Pure function to determine if invoice status should change on payment failure
 * Used for testing Property 14
 * _需求: 6.7_ - Payment verification failure should not change invoice status
 */
export function shouldStatusChangeOnPaymentFailure(
  _currentStatus: InvoiceStatusType,
  _failureDetails: PaymentFailureDetails
): boolean {
  // Per requirement 6.7: If payment verification fails, invoice status should remain unchanged
  // This function always returns false because payment failure should never change status
  return false;
}

/**
 * Pure function to get invoice status after payment failure
 * Used for testing Property 14
 * _需求: 6.7_
 */
export function getStatusAfterPaymentFailure(
  currentStatus: InvoiceStatusType,
  _failureDetails: PaymentFailureDetails
): InvoiceStatusType {
  // Per requirement 6.7: Status remains unchanged on payment failure
  return currentStatus;
}

/**
 * Pure function to create ledger entry data from invoice
 * Used for testing Property 13
 */
export function createLedgerEntryData(
  invoice: {
    id: string;
    userId: string;
    clientId: string;
    projectId: string | null;
    total: Decimal | string;
    currency: Currency;
    invoiceNumber: string;
  },
  client: {
    country: string | null;
  },
  paymentDetails: {
    paymentMethod: PaymentMethod;
    pspProvider?: string;
    pspPaymentId?: string;
  }
): {
  userId: string;
  invoiceId: string;
  clientId: string;
  projectId: string | null;
  entryDate: Date;
  amount: Decimal;
  currency: Currency;
  amountInDefaultCurrency: Decimal;
  paymentMethod: PaymentMethod;
  clientCountry: string | null;
  metadata: Record<string, unknown>;
} {
  const amount = typeof invoice.total === 'string' 
    ? new Decimal(invoice.total) 
    : invoice.total;

  return {
    userId: invoice.userId,
    invoiceId: invoice.id,
    clientId: invoice.clientId,
    projectId: invoice.projectId,
    entryDate: new Date(),
    amount,
    currency: invoice.currency,
    amountInDefaultCurrency: amount, // TODO: Apply exchange rate
    paymentMethod: paymentDetails.paymentMethod,
    clientCountry: client.country,
    metadata: {
      pspProvider: paymentDetails.pspProvider,
      pspPaymentId: paymentDetails.pspPaymentId,
      invoiceNumber: invoice.invoiceNumber,
    },
  };
}
