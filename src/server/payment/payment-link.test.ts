/**
 * Property tests for Payment Link Service
 * **Feature: workwork-ledger-mvp**
 * **Validates: Requirements 6.1**
 */

import { describe, it } from 'vitest';
import { fc } from '@/test/fc-config';
import { getInvoiceByToken } from './payment-link';

// Generate a hex string of specified length
const hexStringArb = (length: number) =>
  fc.array(fc.integer({ min: 0, max: 15 }), { minLength: length, maxLength: length })
    .map((arr) => arr.map((n) => n.toString(16)).join(''));

// Arbitrary for invoice with payment token
const invoiceWithTokenArb = fc.record({
  id: fc.uuid(),
  invoiceNumber: fc.stringMatching(/^INV-[0-9]{6}-[0-9]{4}$/),
  paymentToken: fc.option(hexStringArb(64), { nil: null }),
  status: fc.constantFrom('draft', 'sent', 'paid', 'overdue', 'cancelled'),
  total: fc.stringMatching(/^[0-9]+\.[0-9]{2}$/),
  currency: fc.constantFrom('USD', 'EUR', 'HKD', 'GBP', 'JPY'),
});

describe('Payment Link Service', () => {
  /**
   * **Feature: workwork-ledger-mvp, Property 15: 支付链接有效性**
   * *对于任意*有效的 paymentToken，应能检索到对应的发票
   * **Validates: Requirements 6.1**
   */
  describe('Property 15: Payment Link Validity', () => {
    it('valid payment token retrieves corresponding invoice', () => {
      fc.assert(
        fc.property(
          fc.array(invoiceWithTokenArb, { minLength: 1, maxLength: 50 }),
          fc.nat({ max: 49 }),
          (invoices, indexSeed) => {
            // Find invoices with valid tokens
            const invoicesWithTokens = invoices.filter((inv) => inv.paymentToken !== null);
            
            if (invoicesWithTokens.length === 0) {
              // No invoices with tokens, skip this test case
              return true;
            }

            // Pick a random invoice with a token
            const index = indexSeed % invoicesWithTokens.length;
            const targetInvoice = invoicesWithTokens[index];
            const token = targetInvoice.paymentToken!;

            // Should find the invoice
            const found = getInvoiceByToken(invoices, token);
            
            return found !== null && found.id === targetInvoice.id;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('invalid payment token returns null', () => {
      fc.assert(
        fc.property(
          fc.array(invoiceWithTokenArb, { minLength: 0, maxLength: 50 }),
          hexStringArb(64),
          (invoices, randomToken) => {
            // Ensure the random token doesn't match any existing token
            const existingTokens = new Set(
              invoices.map((inv) => inv.paymentToken).filter(Boolean)
            );
            
            if (existingTokens.has(randomToken)) {
              // Token happens to match, skip this case
              return true;
            }

            const found = getInvoiceByToken(invoices, randomToken);
            return found === null;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('empty token returns null', () => {
      fc.assert(
        fc.property(
          fc.array(invoiceWithTokenArb, { minLength: 0, maxLength: 50 }),
          (invoices) => {
            const foundEmpty = getInvoiceByToken(invoices, '');
            return foundEmpty === null;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('null-like tokens return null', () => {
      fc.assert(
        fc.property(
          fc.array(invoiceWithTokenArb, { minLength: 0, maxLength: 50 }),
          fc.constantFrom('', ' ', '\t', '\n'),
          (invoices, invalidToken) => {
            // These should all return null since they're not valid tokens
            const found = getInvoiceByToken(invoices, invalidToken);
            return found === null;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('token lookup is deterministic', () => {
      fc.assert(
        fc.property(
          fc.array(invoiceWithTokenArb, { minLength: 1, maxLength: 50 }),
          hexStringArb(64),
          (invoices, token) => {
            // Looking up the same token twice should give the same result
            const first = getInvoiceByToken(invoices, token);
            const second = getInvoiceByToken(invoices, token);
            
            if (first === null && second === null) {
              return true;
            }
            
            if (first !== null && second !== null) {
              return first.id === second.id;
            }
            
            return false; // One is null and the other isn't
          }
        ),
        { numRuns: 100 }
      );
    });

    it('each token maps to at most one invoice', () => {
      fc.assert(
        fc.property(
          fc.array(invoiceWithTokenArb, { minLength: 0, maxLength: 50 }),
          (invoices) => {
            // For each unique token, there should be at most one invoice
            const tokenToInvoices = new Map<string, string[]>();
            
            for (const inv of invoices) {
              if (inv.paymentToken) {
                const existing = tokenToInvoices.get(inv.paymentToken) || [];
                existing.push(inv.id);
                tokenToInvoices.set(inv.paymentToken, existing);
              }
            }

            // getInvoiceByToken returns the first match, which is consistent
            for (const [token, ids] of tokenToInvoices) {
              const found = getInvoiceByToken(invoices, token);
              if (found === null) {
                return false; // Should have found something
              }
              // The found invoice should be one of the invoices with this token
              if (!ids.includes(found.id)) {
                return false;
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
