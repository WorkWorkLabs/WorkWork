/**
 * Crypto Payment Handler
 * Handles successful crypto payments and creates ledger entries
 * _需求: 6.5, 7.2_
 */

import { prisma } from '@/lib/prisma';
import Decimal from 'decimal.js';
import type { Chain, StablecoinAsset, PaymentMethod } from '@/types/domain';

/**
 * Crypto payment details
 */
export interface CryptoPaymentDetails {
  chain: Chain;
  asset: StablecoinAsset;
  txHash: string;
  fromAddress: string;
  toAddress: string;
  amount: Decimal;
  blockNumber?: string;
  webhookId?: string;
}

/**
 * Result of crypto payment handling
 */
export interface CryptoPaymentResult {
  success: boolean;
  error?: string;
  ledgerEntryId?: string;
}

/**
 * Handle successful crypto payment
 * Updates invoice status to 'paid' and creates ledger entry with chain info
 * _需求: 6.5, 7.2_
 */
export async function handleCryptoPaymentSuccess(
  invoiceId: string,
  details: CryptoPaymentDetails
): Promise<CryptoPaymentResult> {
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
      console.error(`[Crypto Payment] Invoice not found: ${invoiceId}`);
      return {
        success: false,
        error: 'Invoice not found',
      };
    }

    // Check if invoice is already paid
    if (invoice.status === 'paid') {
      console.log(`[Crypto Payment] Invoice ${invoiceId} already paid, skipping`);
      return {
        success: true,
        ledgerEntryId: undefined,
      };
    }

    // Check if invoice can be paid (not cancelled)
    if (invoice.status === 'cancelled') {
      console.error(`[Crypto Payment] Cannot pay cancelled invoice: ${invoiceId}`);
      return {
        success: false,
        error: 'Invoice is cancelled',
      };
    }

    // Determine payment method based on asset
    const paymentMethod: PaymentMethod = details.asset === 'USDT' ? 'crypto_usdt' : 'crypto_usdc';

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
        type: 'crypto' as const,
        amount: invoice.total,
        currency: invoice.currency,
        status: 'succeeded' as const,
        completedAt: now,
        metadata: {
          chain: details.chain,
          asset: details.asset,
          txHash: details.txHash,
          blockNumber: details.blockNumber,
          webhookId: details.webhookId,
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

      // Create or update crypto payment details
      const existingCryptoPayment = await tx.cryptoPayment.findUnique({
        where: { paymentId: payment.id },
      });

      if (!existingCryptoPayment) {
        await tx.cryptoPayment.create({
          data: {
            paymentId: payment.id,
            chain: details.chain,
            asset: details.asset,
            txHash: details.txHash,
            fromAddress: details.fromAddress,
            toAddress: details.toAddress,
            confirmations: 0, // Will be updated by verification
          },
        });
      } else {
        await tx.cryptoPayment.update({
          where: { paymentId: payment.id },
          data: {
            txHash: details.txHash,
            fromAddress: details.fromAddress,
            toAddress: details.toAddress,
          },
        });
      }

      // Create ledger entry with chain information
      // _需求: 7.2_ - Create ledger entry with chain-specific details
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
          paymentMethod,
          clientCountry: invoice.client.country,
          metadata: {
            chain: details.chain,
            asset: details.asset,
            txHash: details.txHash,
            fromAddress: details.fromAddress,
            toAddress: details.toAddress,
            blockNumber: details.blockNumber,
            invoiceNumber: invoice.invoiceNumber,
          },
        },
      });

      return { ledgerEntryId: ledgerEntry.id };
    });

    console.log(`[Crypto Payment] Successfully processed payment for invoice ${invoiceId}`);
    return {
      success: true,
      ledgerEntryId: result.ledgerEntryId,
    };
  } catch (error) {
    console.error(`[Crypto Payment] Error processing payment for invoice ${invoiceId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Pure function to determine payment method from crypto asset
 * Used for testing
 */
export function getPaymentMethodFromAsset(asset: StablecoinAsset): PaymentMethod {
  return asset === 'USDT' ? 'crypto_usdt' : 'crypto_usdc';
}

/**
 * Pure function to create crypto ledger entry metadata
 * Used for testing
 */
export function createCryptoLedgerMetadata(
  details: CryptoPaymentDetails,
  invoiceNumber: string
): Record<string, unknown> {
  return {
    chain: details.chain,
    asset: details.asset,
    txHash: details.txHash,
    fromAddress: details.fromAddress,
    toAddress: details.toAddress,
    blockNumber: details.blockNumber,
    invoiceNumber,
  };
}
