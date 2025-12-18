/**
 * Ledger Service Property Tests
 * Tests for requirements 8.2, 8.4
 */

import { describe, it } from 'vitest';
import { fc } from '@/test/fc-config';
import Decimal from 'decimal.js';
import {
  filterLedgerEntries,
  calculateAmountInDefaultCurrency,
  getExchangeRate,
  convertCurrency,
  type LedgerFilters,
} from './ledger.service';
import {
  currencyArb,
  paymentMethodArb,
  dateArb,
  decimalArb,
} from '@/test/arbitraries';

// ============================================
// Test Data Generators
// ============================================

/**
 * Generate a ledger entry for filtering tests
 */
const ledgerEntryForFilterArb = fc.record({
  id: fc.uuid(),
  userId: fc.uuid(),
  invoiceId: fc.uuid(),
  clientId: fc.uuid(),
  projectId: fc.option(fc.uuid(), { nil: undefined }),
  entryDate: dateArb,
  amount: decimalArb(0.01, 100000, 2),
  currency: currencyArb,
  amountInDefaultCurrency: decimalArb(0.01, 100000, 2),
  paymentMethod: paymentMethodArb,
  clientCountry: fc.string({ minLength: 2, maxLength: 2 }),
  metadata: fc.constant({}),
  createdAt: dateArb,
});

/**
 * Generate a list of ledger entries with some shared properties
 * This ensures we have entries that will match filters
 */
const ledgerEntriesWithSharedPropsArb = fc.tuple(
  fc.uuid(), // shared userId
  fc.uuid(), // shared clientId
  fc.uuid(), // shared projectId
  currencyArb, // shared currency
  paymentMethodArb, // shared paymentMethod
).chain(([userId, clientId, projectId, currency, paymentMethod]) =>
  fc.array(
    fc.record({
      id: fc.uuid(),
      userId: fc.oneof(fc.constant(userId), fc.uuid()),
      invoiceId: fc.uuid(),
      clientId: fc.oneof(fc.constant(clientId), fc.uuid()),
      projectId: fc.oneof(fc.constant(projectId), fc.uuid(), fc.constant(undefined)),
      entryDate: dateArb,
      amount: decimalArb(0.01, 100000, 2),
      currency: fc.oneof(fc.constant(currency), currencyArb),
      amountInDefaultCurrency: decimalArb(0.01, 100000, 2),
      paymentMethod: fc.oneof(fc.constant(paymentMethod), paymentMethodArb),
      clientCountry: fc.string({ minLength: 2, maxLength: 2 }),
      metadata: fc.constant({}),
      createdAt: dateArb,
    }),
    { minLength: 1, maxLength: 50 }
  ).map(entries => ({
    entries,
    sharedUserId: userId,
    sharedClientId: clientId,
    sharedProjectId: projectId,
    sharedCurrency: currency,
    sharedPaymentMethod: paymentMethod,
  }))
);

// ============================================
// Property Tests
// ============================================

describe('Ledger Service Property Tests', () => {
  /**
   * **Feature: workwork-ledger-mvp, Property 18: 账本筛选正确性**
   * *对于任意*筛选条件（时间范围、客户、项目、币种），返回的账本条目应全部满足筛选条件
   * **验证: 需求 8.2**
   */
  describe('Property 18: Ledger Filter Correctness', () => {
    it('all filtered entries should match the userId filter', () => {
      fc.assert(
        fc.property(
          ledgerEntriesWithSharedPropsArb,
          ({ entries, sharedUserId }) => {
            const filters: LedgerFilters = { userId: sharedUserId };
            const filtered = filterLedgerEntries(entries, filters);
            
            // All filtered entries should have the matching userId
            return filtered.every(entry => entry.userId === sharedUserId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('all filtered entries should match the clientId filter when provided', () => {
      fc.assert(
        fc.property(
          ledgerEntriesWithSharedPropsArb,
          ({ entries, sharedUserId, sharedClientId }) => {
            const filters: LedgerFilters = {
              userId: sharedUserId,
              clientId: sharedClientId,
            };
            const filtered = filterLedgerEntries(entries, filters);
            
            // All filtered entries should have matching userId AND clientId
            return filtered.every(
              entry => entry.userId === sharedUserId && entry.clientId === sharedClientId
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('all filtered entries should match the projectId filter when provided', () => {
      fc.assert(
        fc.property(
          ledgerEntriesWithSharedPropsArb,
          ({ entries, sharedUserId, sharedProjectId }) => {
            const filters: LedgerFilters = {
              userId: sharedUserId,
              projectId: sharedProjectId,
            };
            const filtered = filterLedgerEntries(entries, filters);
            
            // All filtered entries should have matching userId AND projectId
            return filtered.every(
              entry => entry.userId === sharedUserId && entry.projectId === sharedProjectId
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('all filtered entries should match the currency filter when provided', () => {
      fc.assert(
        fc.property(
          ledgerEntriesWithSharedPropsArb,
          ({ entries, sharedUserId, sharedCurrency }) => {
            const filters: LedgerFilters = {
              userId: sharedUserId,
              currency: sharedCurrency,
            };
            const filtered = filterLedgerEntries(entries, filters);
            
            // All filtered entries should have matching userId AND currency
            return filtered.every(
              entry => entry.userId === sharedUserId && entry.currency === sharedCurrency
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('all filtered entries should match the paymentMethod filter when provided', () => {
      fc.assert(
        fc.property(
          ledgerEntriesWithSharedPropsArb,
          ({ entries, sharedUserId, sharedPaymentMethod }) => {
            const filters: LedgerFilters = {
              userId: sharedUserId,
              paymentMethod: sharedPaymentMethod,
            };
            const filtered = filterLedgerEntries(entries, filters);
            
            // All filtered entries should have matching userId AND paymentMethod
            return filtered.every(
              entry => entry.userId === sharedUserId && entry.paymentMethod === sharedPaymentMethod
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('all filtered entries should be within date range when provided', () => {
      fc.assert(
        fc.property(
          ledgerEntriesWithSharedPropsArb,
          fc.tuple(dateArb, dateArb).map(([d1, d2]) => 
            d1 < d2 ? { startDate: d1, endDate: d2 } : { startDate: d2, endDate: d1 }
          ),
          ({ entries, sharedUserId }, { startDate, endDate }) => {
            const filters: LedgerFilters = {
              userId: sharedUserId,
              startDate,
              endDate,
            };
            const filtered = filterLedgerEntries(entries, filters);
            
            // All filtered entries should be within the date range
            return filtered.every(entry => {
              const matchesUser = entry.userId === sharedUserId;
              const afterStart = entry.entryDate >= startDate;
              const beforeEnd = entry.entryDate <= endDate;
              return matchesUser && afterStart && beforeEnd;
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('combined filters should all be satisfied', () => {
      fc.assert(
        fc.property(
          ledgerEntriesWithSharedPropsArb,
          ({ entries, sharedUserId, sharedClientId, sharedCurrency, sharedPaymentMethod }) => {
            const filters: LedgerFilters = {
              userId: sharedUserId,
              clientId: sharedClientId,
              currency: sharedCurrency,
              paymentMethod: sharedPaymentMethod,
            };
            const filtered = filterLedgerEntries(entries, filters);
            
            // All filtered entries should satisfy ALL filter conditions
            return filtered.every(entry =>
              entry.userId === sharedUserId &&
              entry.clientId === sharedClientId &&
              entry.currency === sharedCurrency &&
              entry.paymentMethod === sharedPaymentMethod
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('filtering should not add entries that do not exist in original list', () => {
      fc.assert(
        fc.property(
          ledgerEntriesWithSharedPropsArb,
          ({ entries, sharedUserId }) => {
            const filters: LedgerFilters = { userId: sharedUserId };
            const filtered = filterLedgerEntries(entries, filters);
            
            // All filtered entries should exist in the original list
            const originalIds = new Set(entries.map(e => e.id));
            return filtered.every(entry => originalIds.has(entry.id));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('filtering with no matching entries should return empty array', () => {
      fc.assert(
        fc.property(
          fc.array(ledgerEntryForFilterArb, { minLength: 1, maxLength: 20 }),
          fc.uuid(), // non-existent userId
          (entries, nonExistentUserId) => {
            // Ensure the userId doesn't exist in entries
            const existingUserIds = new Set(entries.map(e => e.userId));
            if (existingUserIds.has(nonExistentUserId)) {
              return true; // Skip this case
            }
            
            const filters: LedgerFilters = { userId: nonExistentUserId };
            const filtered = filterLedgerEntries(entries, filters);
            
            return filtered.length === 0;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: workwork-ledger-mvp, Property 19: 汇率转换正确性**
   * *对于任意*账本条目和汇率，amountInDefaultCurrency 应等于 amount × exchangeRate
   * **验证: 需求 8.4**
   */
  describe('Property 19: Exchange Rate Conversion Correctness', () => {
    it('calculateAmountInDefaultCurrency should equal amount * exchangeRate', () => {
      fc.assert(
        fc.property(
          decimalArb(0.01, 100000, 2), // amount
          decimalArb(0.0001, 1000, 6), // exchangeRate
          (amount, exchangeRate) => {
            const result = calculateAmountInDefaultCurrency(amount, exchangeRate);
            const expected = amount.mul(exchangeRate);
            
            // Compare with tolerance for floating point precision
            return result.minus(expected).abs().lessThan(new Decimal('0.000001'));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('same currency conversion should return same amount', () => {
      fc.assert(
        fc.property(
          decimalArb(0.01, 100000, 2),
          currencyArb,
          (amount, currency) => {
            const result = convertCurrency(amount, currency, currency);
            
            // Same currency should return exact same amount
            return result.equals(amount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('exchange rate for same currency should be 1', () => {
      fc.assert(
        fc.property(
          currencyArb,
          (currency) => {
            const rate = getExchangeRate(currency, currency);
            return rate.equals(new Decimal(1));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('round-trip conversion should preserve approximate value', () => {
      fc.assert(
        fc.property(
          decimalArb(0.01, 10000, 2),
          currencyArb,
          currencyArb,
          (amount, sourceCurrency, targetCurrency) => {
            // Convert from source to target, then back to source
            const converted = convertCurrency(amount, sourceCurrency, targetCurrency);
            const roundTrip = convertCurrency(converted, targetCurrency, sourceCurrency);
            
            // Should be approximately equal (within 1% due to rounding)
            const diff = roundTrip.minus(amount).abs();
            const tolerance = amount.mul(0.01);
            
            return diff.lessThanOrEqualTo(tolerance);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('conversion should be positive for positive amounts', () => {
      fc.assert(
        fc.property(
          decimalArb(0.01, 100000, 2),
          currencyArb,
          currencyArb,
          (amount, sourceCurrency, targetCurrency) => {
            const result = convertCurrency(amount, sourceCurrency, targetCurrency);
            return result.greaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
