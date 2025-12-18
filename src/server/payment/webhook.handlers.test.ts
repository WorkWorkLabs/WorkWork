/**
 * Property tests for Webhook Handlers
 * **Feature: workwork-ledger-mvp**
 * **Validates: Requirements 5.7, 6.7, 8.1**
 */

import { describe, it } from 'vitest';
import { fc } from '@/test/fc-config';
import Decimal from 'decimal.js';
import type { Currency, PaymentMethod } from '@prisma/client';
import {
  createLedgerEntryData,
  determinePaymentMethod,
  shouldStatusChangeOnPaymentFailure,
  getStatusAfterPaymentFailure,
  type InvoiceStatusType,
  type PaymentFailureDetails,
} from './webhook.handlers';

// Arbitraries
const currencyArb = fc.constantFrom<Currency>('USD', 'EUR', 'HKD', 'GBP', 'JPY');
const paymentMethodArb = fc.constantFrom<PaymentMethod>('card', 'bank_transfer', 'crypto_usdc', 'crypto_usdt');

const decimalArb = (min: number = 0.01, max: number = 1000000): fc.Arbitrary<Decimal> => {
  const multiplier = 100;
  return fc
    .integer({ min: Math.floor(min * multiplier), max: Math.floor(max * multiplier) })
    .map((n) => new Decimal(n).div(multiplier));
};

// Invoice arbitrary for testing
const invoiceArb = fc.record({
  id: fc.uuid(),
  userId: fc.uuid(),
  clientId: fc.uuid(),
  projectId: fc.option(fc.uuid(), { nil: null }),
  total: decimalArb(0.01, 100000),
  currency: currencyArb,
  invoiceNumber: fc.stringMatching(/^INV-[0-9]{6}-[0-9]{4}$/),
});

// Client arbitrary for testing
const clientArb = fc.record({
  country: fc.option(fc.stringMatching(/^[A-Z]{2}$/), { nil: null }),
});

// Payment details arbitrary
const paymentDetailsArb = fc.record({
  paymentMethod: paymentMethodArb,
  pspProvider: fc.option(fc.constantFrom('stripe', 'airwallex'), { nil: undefined }),
  pspPaymentId: fc.option(fc.uuid(), { nil: undefined }),
});

describe('Webhook Handlers', () => {
  /**
   * **Feature: workwork-ledger-mvp, Property 13: 支付完成创建账本条目**
   * *对于任意*发票，当标记为已付时，应自动创建一条包含正确金额、币种、客户信息的账本条目
   * **Validates: Requirements 5.7, 8.1**
   */
  describe('Property 13: Payment Completion Creates Ledger Entry', () => {
    it('ledger entry contains correct invoice amount', () => {
      fc.assert(
        fc.property(invoiceArb, clientArb, paymentDetailsArb, (invoice, client, paymentDetails) => {
          const ledgerEntry = createLedgerEntryData(invoice, client, paymentDetails);
          
          // Amount should match invoice total
          return ledgerEntry.amount.equals(invoice.total);
        }),
        { numRuns: 100 }
      );
    });

    it('ledger entry contains correct currency', () => {
      fc.assert(
        fc.property(invoiceArb, clientArb, paymentDetailsArb, (invoice, client, paymentDetails) => {
          const ledgerEntry = createLedgerEntryData(invoice, client, paymentDetails);
          
          // Currency should match invoice currency
          return ledgerEntry.currency === invoice.currency;
        }),
        { numRuns: 100 }
      );
    });

    it('ledger entry contains correct client information', () => {
      fc.assert(
        fc.property(invoiceArb, clientArb, paymentDetailsArb, (invoice, client, paymentDetails) => {
          const ledgerEntry = createLedgerEntryData(invoice, client, paymentDetails);
          
          // Client ID should match
          const clientIdMatches = ledgerEntry.clientId === invoice.clientId;
          // Client country should match
          const countryMatches = ledgerEntry.clientCountry === client.country;
          
          return clientIdMatches && countryMatches;
        }),
        { numRuns: 100 }
      );
    });

    it('ledger entry contains correct invoice reference', () => {
      fc.assert(
        fc.property(invoiceArb, clientArb, paymentDetailsArb, (invoice, client, paymentDetails) => {
          const ledgerEntry = createLedgerEntryData(invoice, client, paymentDetails);
          
          // Invoice ID should match
          const invoiceIdMatches = ledgerEntry.invoiceId === invoice.id;
          // User ID should match
          const userIdMatches = ledgerEntry.userId === invoice.userId;
          // Project ID should match
          const projectIdMatches = ledgerEntry.projectId === invoice.projectId;
          
          return invoiceIdMatches && userIdMatches && projectIdMatches;
        }),
        { numRuns: 100 }
      );
    });

    it('ledger entry contains correct payment method', () => {
      fc.assert(
        fc.property(invoiceArb, clientArb, paymentDetailsArb, (invoice, client, paymentDetails) => {
          const ledgerEntry = createLedgerEntryData(invoice, client, paymentDetails);
          
          // Payment method should match
          return ledgerEntry.paymentMethod === paymentDetails.paymentMethod;
        }),
        { numRuns: 100 }
      );
    });

    it('ledger entry metadata contains invoice number', () => {
      fc.assert(
        fc.property(invoiceArb, clientArb, paymentDetailsArb, (invoice, client, paymentDetails) => {
          const ledgerEntry = createLedgerEntryData(invoice, client, paymentDetails);
          
          // Metadata should contain invoice number
          return ledgerEntry.metadata.invoiceNumber === invoice.invoiceNumber;
        }),
        { numRuns: 100 }
      );
    });

    it('ledger entry has valid entry date', () => {
      fc.assert(
        fc.property(invoiceArb, clientArb, paymentDetailsArb, (invoice, client, paymentDetails) => {
          const before = new Date();
          const ledgerEntry = createLedgerEntryData(invoice, client, paymentDetails);
          const after = new Date();
          
          // Entry date should be between before and after
          return ledgerEntry.entryDate >= before && ledgerEntry.entryDate <= after;
        }),
        { numRuns: 100 }
      );
    });

    it('ledger entry amount in default currency is properly converted', () => {
      fc.assert(
        fc.property(invoiceArb, clientArb, paymentDetailsArb, (invoice, client, paymentDetails) => {
          // When default currency matches invoice currency, amounts should be equal
          const ledgerEntry = createLedgerEntryData(invoice, client, paymentDetails, invoice.currency);
          
          // Same currency should result in equal amounts
          return ledgerEntry.amountInDefaultCurrency.equals(ledgerEntry.amount);
        }),
        { numRuns: 100 }
      );
    });

    it('ledger entry amount in default currency is converted when currencies differ', () => {
      fc.assert(
        fc.property(invoiceArb, clientArb, paymentDetailsArb, (invoice, client, paymentDetails) => {
          // Use USD as default currency
          const ledgerEntry = createLedgerEntryData(invoice, client, paymentDetails, 'USD');
          
          // Amount in default currency should be positive
          return ledgerEntry.amountInDefaultCurrency.greaterThan(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Payment Method Determination', () => {
    it('fiat payments return card method', () => {
      fc.assert(
        fc.property(fc.constant('fiat' as const), () => {
          const method = determinePaymentMethod('fiat');
          return method === 'card';
        }),
        { numRuns: 10 }
      );
    });

    it('crypto USDC payments return crypto_usdc method', () => {
      fc.assert(
        fc.property(fc.constant('crypto' as const), () => {
          const method = determinePaymentMethod('crypto', 'USDC');
          return method === 'crypto_usdc';
        }),
        { numRuns: 10 }
      );
    });

    it('crypto USDT payments return crypto_usdt method', () => {
      fc.assert(
        fc.property(fc.constant('crypto' as const), () => {
          const method = determinePaymentMethod('crypto', 'USDT');
          return method === 'crypto_usdt';
        }),
        { numRuns: 10 }
      );
    });

    it('crypto without asset defaults to crypto_usdc', () => {
      fc.assert(
        fc.property(fc.constant('crypto' as const), () => {
          const method = determinePaymentMethod('crypto');
          return method === 'crypto_usdc';
        }),
        { numRuns: 10 }
      );
    });
  });

  /**
   * **Feature: workwork-ledger-mvp, Property 14: 支付验证失败状态不变**
   * *对于任意*发票，如果支付验证失败，发票状态应保持不变
   * **Validates: Requirements 6.7**
   */
  describe('Property 14: Payment Verification Failure Status Unchanged', () => {
    // Arbitrary for invoice status (excluding 'paid' since paid invoices wouldn't have payment failures)
    const invoiceStatusArb = fc.constantFrom<InvoiceStatusType>(
      'draft',
      'sent',
      'paid',
      'overdue',
      'cancelled'
    );

    // Arbitrary for payment failure details
    const paymentFailureDetailsArb: fc.Arbitrary<PaymentFailureDetails> = fc.record({
      eventType: fc.constantFrom(
        'checkout.session.expired',
        'payment_intent.payment_failed',
        'payment_intent.canceled'
      ),
      pspProvider: fc.constantFrom('stripe', 'airwallex'),
      errorMessage: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
    });

    it('payment failure should never change invoice status', () => {
      fc.assert(
        fc.property(invoiceStatusArb, paymentFailureDetailsArb, (status, failureDetails) => {
          // shouldStatusChangeOnPaymentFailure should always return false
          return shouldStatusChangeOnPaymentFailure(status, failureDetails) === false;
        }),
        { numRuns: 100 }
      );
    });

    it('invoice status after payment failure equals original status', () => {
      fc.assert(
        fc.property(invoiceStatusArb, paymentFailureDetailsArb, (status, failureDetails) => {
          const statusAfterFailure = getStatusAfterPaymentFailure(status, failureDetails);
          return statusAfterFailure === status;
        }),
        { numRuns: 100 }
      );
    });

    it('draft invoices remain draft after payment failure', () => {
      fc.assert(
        fc.property(paymentFailureDetailsArb, (failureDetails) => {
          const statusAfterFailure = getStatusAfterPaymentFailure('draft', failureDetails);
          return statusAfterFailure === 'draft';
        }),
        { numRuns: 100 }
      );
    });

    it('sent invoices remain sent after payment failure', () => {
      fc.assert(
        fc.property(paymentFailureDetailsArb, (failureDetails) => {
          const statusAfterFailure = getStatusAfterPaymentFailure('sent', failureDetails);
          return statusAfterFailure === 'sent';
        }),
        { numRuns: 100 }
      );
    });

    it('overdue invoices remain overdue after payment failure', () => {
      fc.assert(
        fc.property(paymentFailureDetailsArb, (failureDetails) => {
          const statusAfterFailure = getStatusAfterPaymentFailure('overdue', failureDetails);
          return statusAfterFailure === 'overdue';
        }),
        { numRuns: 100 }
      );
    });

    it('cancelled invoices remain cancelled after payment failure', () => {
      fc.assert(
        fc.property(paymentFailureDetailsArb, (failureDetails) => {
          const statusAfterFailure = getStatusAfterPaymentFailure('cancelled', failureDetails);
          return statusAfterFailure === 'cancelled';
        }),
        { numRuns: 100 }
      );
    });

    it('status unchanged regardless of failure event type', () => {
      const failureEventTypes = [
        'checkout.session.expired',
        'payment_intent.payment_failed',
        'payment_intent.canceled',
      ];

      fc.assert(
        fc.property(
          invoiceStatusArb,
          fc.constantFrom(...failureEventTypes),
          (status, eventType) => {
            const failureDetails: PaymentFailureDetails = {
              eventType,
              pspProvider: 'stripe',
            };
            const statusAfterFailure = getStatusAfterPaymentFailure(status, failureDetails);
            return statusAfterFailure === status;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('status unchanged regardless of PSP provider', () => {
      fc.assert(
        fc.property(
          invoiceStatusArb,
          fc.constantFrom('stripe', 'airwallex'),
          (status, pspProvider) => {
            const failureDetails: PaymentFailureDetails = {
              eventType: 'payment_intent.payment_failed',
              pspProvider,
            };
            const statusAfterFailure = getStatusAfterPaymentFailure(status, failureDetails);
            return statusAfterFailure === status;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
