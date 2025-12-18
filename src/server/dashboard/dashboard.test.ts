/**
 * Dashboard Service Property Tests
 * Tests for requirements 9.1, 9.3, 9.4, 9.5, 9.6
 */

import { describe, it, expect } from 'vitest';
import { fc } from '@/test/fc-config';
import Decimal from 'decimal.js';
import {
  calculateTotalIncome,
  aggregateByPeriod,
  calculateClientRankings,
  calculatePaymentMethodDistribution,
  calculateTaxReserve,
  aggregateStablecoinIncome,
  type Chain,
} from './dashboard.service';
import {
  currencyArb,
  paymentMethodArb,
  dateArb,
  decimalArb,
} from '@/test/arbitraries';
import type { PaymentMethod } from '@/types/domain';

// ============================================
// Test Data Generators
// ============================================

/**
 * Generate a ledger entry for dashboard tests
 */
const dashboardEntryArb = fc.record({
  id: fc.uuid(),
  userId: fc.uuid(),
  invoiceId: fc.uuid(),
  clientId: fc.uuid(),
  clientName: fc.string({ minLength: 1, maxLength: 50 }),
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
 * Generate entries with shared client IDs for ranking tests
 */
const entriesWithSharedClientsArb = fc.tuple(
  fc.array(fc.uuid(), { minLength: 2, maxLength: 5 }), // client IDs
  fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 2, maxLength: 5 }), // client names
).chain(([clientIds, clientNames]) => {
  // Ensure we have matching arrays
  const ids = clientIds.slice(0, Math.min(clientIds.length, clientNames.length));
  const names = clientNames.slice(0, ids.length);
  
  return fc.array(
    fc.record({
      clientId: fc.constantFrom(...ids),
      clientName: fc.constantFrom(...names),
      amountInDefaultCurrency: decimalArb(0.01, 100000, 2),
    }).map(entry => {
      // Ensure clientName matches clientId
      const idx = ids.indexOf(entry.clientId);
      return {
        ...entry,
        clientName: names[idx] || entry.clientName,
      };
    }),
    { minLength: 1, maxLength: 50 }
  );
});

/**
 * Generate entries with various payment methods
 */
const entriesWithPaymentMethodsArb = fc.array(
  fc.record({
    paymentMethod: paymentMethodArb,
    amountInDefaultCurrency: decimalArb(0.01, 100000, 2),
  }),
  { minLength: 1, maxLength: 50 }
);

// ============================================
// Property Tests
// ============================================

describe('Dashboard Service Property Tests', () => {
  /**
   * **Feature: workwork-ledger-mvp, Property 20: 仪表盘总收入计算**
   * *对于任意*时间段内的账本条目集合，总收入应等于各条目 amountInDefaultCurrency 之和
   * **验证: 需求 9.1**
   */
  describe('Property 20: Dashboard Total Income Calculation', () => {
    it('total income should equal sum of all amountInDefaultCurrency values', () => {
      fc.assert(
        fc.property(
          fc.array(dashboardEntryArb, { minLength: 0, maxLength: 100 }),
          (entries) => {
            const result = calculateTotalIncome(entries);
            
            // Calculate expected sum manually
            const expected = entries.reduce(
              (sum, entry) => sum.add(entry.amountInDefaultCurrency),
              new Decimal(0)
            );
            
            return result.equals(expected);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('total income of empty entries should be zero', () => {
      const result = calculateTotalIncome([]);
      expect(result.equals(new Decimal(0))).toBe(true);
    });

    it('total income of single entry should equal that entry amount', () => {
      fc.assert(
        fc.property(
          dashboardEntryArb,
          (entry) => {
            const result = calculateTotalIncome([entry]);
            return result.equals(entry.amountInDefaultCurrency);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('total income should be non-negative for positive amounts', () => {
      fc.assert(
        fc.property(
          fc.array(dashboardEntryArb, { minLength: 1, maxLength: 50 }),
          (entries) => {
            const result = calculateTotalIncome(entries);
            return result.greaterThanOrEqualTo(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * **Feature: workwork-ledger-mvp, Property 21: 时间聚合守恒**
   * *对于任意*账本条目集合，按周/月聚合后的总和应等于原始总和
   * **验证: 需求 9.3**
   */
  describe('Property 21: Time Aggregation Conservation', () => {
    it('sum of monthly aggregations should equal total income', () => {
      fc.assert(
        fc.property(
          fc.array(dashboardEntryArb, { minLength: 1, maxLength: 100 }),
          (entries) => {
            const aggregations = aggregateByPeriod(entries, 'month');
            
            // Sum of all aggregated amounts
            const aggregatedSum = aggregations.reduce(
              (sum, agg) => sum.add(agg.amount),
              new Decimal(0)
            );
            
            // Original total
            const originalTotal = calculateTotalIncome(entries);
            
            // Should be equal (within floating point tolerance)
            return aggregatedSum.minus(originalTotal).abs().lessThan(new Decimal('0.01'));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('sum of weekly aggregations should equal total income', () => {
      fc.assert(
        fc.property(
          fc.array(dashboardEntryArb, { minLength: 1, maxLength: 100 }),
          (entries) => {
            const aggregations = aggregateByPeriod(entries, 'week');
            
            // Sum of all aggregated amounts
            const aggregatedSum = aggregations.reduce(
              (sum, agg) => sum.add(agg.amount),
              new Decimal(0)
            );
            
            // Original total
            const originalTotal = calculateTotalIncome(entries);
            
            // Should be equal (within floating point tolerance)
            return aggregatedSum.minus(originalTotal).abs().lessThan(new Decimal('0.01'));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('aggregation of empty entries should return empty array', () => {
      const monthlyResult = aggregateByPeriod([], 'month');
      const weeklyResult = aggregateByPeriod([], 'week');
      
      expect(monthlyResult).toEqual([]);
      expect(weeklyResult).toEqual([]);
    });

    it('aggregations should be sorted by period', () => {
      fc.assert(
        fc.property(
          fc.array(dashboardEntryArb, { minLength: 2, maxLength: 50 }),
          (entries) => {
            const aggregations = aggregateByPeriod(entries, 'month');
            
            // Check that periods are sorted
            for (let i = 1; i < aggregations.length; i++) {
              if (aggregations[i].period < aggregations[i - 1].period) {
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

  /**
   * **Feature: workwork-ledger-mvp, Property 22: 客户排名正确性**
   * *对于任意*客户收入数据，Top 5 客户应按收入降序排列，百分比之和应等于这 5 个客户占总收入的比例
   * **验证: 需求 9.4**
   */
  describe('Property 22: Client Ranking Correctness', () => {
    it('top clients should be sorted by amount in descending order', () => {
      fc.assert(
        fc.property(
          entriesWithSharedClientsArb,
          (entries) => {
            const rankings = calculateClientRankings(entries, 5);
            
            // Check descending order
            for (let i = 1; i < rankings.length; i++) {
              if (rankings[i].amount.greaterThan(rankings[i - 1].amount)) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('sum of top client percentages should equal their proportion of total', () => {
      fc.assert(
        fc.property(
          entriesWithSharedClientsArb,
          (entries) => {
            const rankings = calculateClientRankings(entries, 5);
            
            if (rankings.length === 0) return true;
            
            // Calculate total income
            const totalIncome = entries.reduce(
              (sum, entry) => sum.add(entry.amountInDefaultCurrency),
              new Decimal(0)
            );
            
            if (totalIncome.isZero()) return true;
            
            // Sum of top client amounts
            const topClientSum = rankings.reduce(
              (sum, client) => sum.add(client.amount),
              new Decimal(0)
            );
            
            // Expected percentage
            const expectedPercentage = topClientSum.div(totalIncome).mul(100).toNumber();
            
            // Sum of reported percentages
            const reportedPercentageSum = rankings.reduce(
              (sum, client) => sum + client.percentage,
              0
            );
            
            // Should be approximately equal (within 0.1%)
            return Math.abs(expectedPercentage - reportedPercentageSum) < 0.1;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return at most topN clients', () => {
      fc.assert(
        fc.property(
          entriesWithSharedClientsArb,
          fc.integer({ min: 1, max: 10 }),
          (entries, topN) => {
            const rankings = calculateClientRankings(entries, topN);
            return rankings.length <= topN;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('each client percentage should be between 0 and 100', () => {
      fc.assert(
        fc.property(
          entriesWithSharedClientsArb,
          (entries) => {
            const rankings = calculateClientRankings(entries, 5);
            
            return rankings.every(
              client => client.percentage >= 0 && client.percentage <= 100
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('empty entries should return empty rankings', () => {
      const rankings = calculateClientRankings([], 5);
      expect(rankings).toEqual([]);
    });
  });


  /**
   * **Feature: workwork-ledger-mvp, Property 23: 支付方式分布守恒**
   * *对于任意*账本条目集合，法币收入 + 稳定币收入应等于总收入
   * **验证: 需求 9.5**
   */
  describe('Property 23: Payment Method Distribution Conservation', () => {
    it('sum of all payment method amounts should equal total income', () => {
      fc.assert(
        fc.property(
          entriesWithPaymentMethodsArb,
          (entries) => {
            const distribution = calculatePaymentMethodDistribution(entries);
            
            // Sum of all distribution amounts
            const distributionSum = distribution.reduce(
              (sum, dist) => sum.add(dist.amount),
              new Decimal(0)
            );
            
            // Original total
            const originalTotal = entries.reduce(
              (sum, entry) => sum.add(entry.amountInDefaultCurrency),
              new Decimal(0)
            );
            
            // Should be equal
            return distributionSum.equals(originalTotal);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('sum of all percentages should equal 100 (or 0 for empty)', () => {
      fc.assert(
        fc.property(
          entriesWithPaymentMethodsArb,
          (entries) => {
            const distribution = calculatePaymentMethodDistribution(entries);
            
            if (distribution.length === 0) return true;
            
            const percentageSum = distribution.reduce(
              (sum, dist) => sum + dist.percentage,
              0
            );
            
            // Should be approximately 100% (within 0.1%)
            return Math.abs(percentageSum - 100) < 0.1;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('each payment method percentage should be between 0 and 100', () => {
      fc.assert(
        fc.property(
          entriesWithPaymentMethodsArb,
          (entries) => {
            const distribution = calculatePaymentMethodDistribution(entries);
            
            return distribution.every(
              dist => dist.percentage >= 0 && dist.percentage <= 100
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('distribution should be sorted by amount in descending order', () => {
      fc.assert(
        fc.property(
          entriesWithPaymentMethodsArb,
          (entries) => {
            const distribution = calculatePaymentMethodDistribution(entries);
            
            for (let i = 1; i < distribution.length; i++) {
              if (distribution[i].amount.greaterThan(distribution[i - 1].amount)) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('empty entries should return empty distribution', () => {
      const distribution = calculatePaymentMethodDistribution([]);
      expect(distribution).toEqual([]);
    });

    it('fiat + crypto amounts should equal total', () => {
      fc.assert(
        fc.property(
          entriesWithPaymentMethodsArb,
          (entries) => {
            const distribution = calculatePaymentMethodDistribution(entries);
            
            // Separate fiat and crypto
            const fiatMethods: PaymentMethod[] = ['card', 'bank_transfer'];
            const cryptoMethods: PaymentMethod[] = ['crypto_usdc', 'crypto_usdt'];
            
            const fiatTotal = distribution
              .filter(d => fiatMethods.includes(d.method))
              .reduce((sum, d) => sum.add(d.amount), new Decimal(0));
            
            const cryptoTotal = distribution
              .filter(d => cryptoMethods.includes(d.method))
              .reduce((sum, d) => sum.add(d.amount), new Decimal(0));
            
            const totalIncome = entries.reduce(
              (sum, entry) => sum.add(entry.amountInDefaultCurrency),
              new Decimal(0)
            );
            
            // fiat + crypto should equal total
            return fiatTotal.add(cryptoTotal).equals(totalIncome);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: workwork-ledger-mvp, Property 24: 预留税金计算**
   * *对于任意*总收入和税率，建议预留税金应等于 totalIncome × taxRate
   * **验证: 需求 9.6**
   */
  describe('Property 24: Tax Reserve Calculation', () => {
    it('tax reserve should equal totalIncome * taxRate', () => {
      fc.assert(
        fc.property(
          decimalArb(0, 1000000, 2), // totalIncome
          decimalArb(0, 0.5, 4), // taxRate (0% to 50%)
          (totalIncome, taxRate) => {
            const result = calculateTaxReserve(totalIncome, taxRate);
            const expected = totalIncome.mul(taxRate);
            
            // Should be exactly equal
            return result.equals(expected);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('zero tax rate should result in zero reserve', () => {
      fc.assert(
        fc.property(
          decimalArb(0.01, 1000000, 2),
          (totalIncome) => {
            const result = calculateTaxReserve(totalIncome, new Decimal(0));
            return result.equals(new Decimal(0));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('zero income should result in zero reserve', () => {
      fc.assert(
        fc.property(
          decimalArb(0, 0.5, 4),
          (taxRate) => {
            const result = calculateTaxReserve(new Decimal(0), taxRate);
            return result.equals(new Decimal(0));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('tax reserve should be non-negative for non-negative inputs', () => {
      fc.assert(
        fc.property(
          decimalArb(0, 1000000, 2),
          decimalArb(0, 0.5, 4),
          (totalIncome, taxRate) => {
            const result = calculateTaxReserve(totalIncome, taxRate);
            return result.greaterThanOrEqualTo(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('tax reserve should be less than or equal to income for rates <= 100%', () => {
      fc.assert(
        fc.property(
          decimalArb(0.01, 1000000, 2),
          decimalArb(0, 1, 4), // 0% to 100%
          (totalIncome, taxRate) => {
            const result = calculateTaxReserve(totalIncome, taxRate);
            return result.lessThanOrEqualTo(totalIncome);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: workwork-ledger-mvp, Property 17: 稳定币收入聚合一致性**
   * *对于任意*稳定币账本条目集合，按资产统一总额应等于各链明细之和
   * **验证: 需求 7.3**
   */
  describe('Property 17: Stablecoin Income Aggregation Consistency', () => {
    // Generator for crypto payment entries with chain metadata
    const cryptoPaymentMethodArb = fc.constantFrom<PaymentMethod>('crypto_usdc', 'crypto_usdt');
    const chainArb = fc.constantFrom<Chain>('arbitrum', 'base', 'polygon');

    const cryptoEntryArb = fc.record({
      paymentMethod: cryptoPaymentMethodArb,
      amountInDefaultCurrency: decimalArb(0.01, 100000, 2),
      metadata: fc.record({
        chain: chainArb,
        txHash: fc.string({ minLength: 64, maxLength: 64 }),
      }),
    });

    // Mixed entries (crypto + fiat) for testing filtering
    const mixedEntryArb = fc.oneof(
      cryptoEntryArb,
      fc.record({
        paymentMethod: fc.constantFrom<PaymentMethod>('card', 'bank_transfer'),
        amountInDefaultCurrency: decimalArb(0.01, 100000, 2),
        metadata: fc.constant(null),
      })
    );

    it('total stablecoin income should equal sum of all asset totals', () => {
      fc.assert(
        fc.property(
          fc.array(cryptoEntryArb, { minLength: 0, maxLength: 50 }),
          (entries) => {
            const result = aggregateStablecoinIncome(entries);

            // Sum of all asset totals
            const assetTotalSum = result.byAsset.reduce(
              (sum, asset) => sum.add(asset.totalAmount),
              new Decimal(0)
            );

            // Should equal totalStablecoinIncome
            return result.totalStablecoinIncome.equals(assetTotalSum);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('each asset total should equal sum of its chain breakdown amounts', () => {
      fc.assert(
        fc.property(
          fc.array(cryptoEntryArb, { minLength: 1, maxLength: 50 }),
          (entries) => {
            const result = aggregateStablecoinIncome(entries);

            for (const assetAgg of result.byAsset) {
              const chainSum = assetAgg.chainBreakdown.reduce(
                (sum, chain) => sum.add(chain.amount),
                new Decimal(0)
              );

              if (!assetAgg.totalAmount.equals(chainSum)) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('chain breakdown percentages should sum to 100% for each asset', () => {
      fc.assert(
        fc.property(
          fc.array(cryptoEntryArb, { minLength: 1, maxLength: 50 }),
          (entries) => {
            const result = aggregateStablecoinIncome(entries);

            for (const assetAgg of result.byAsset) {
              if (assetAgg.chainBreakdown.length === 0) continue;

              const percentageSum = assetAgg.chainBreakdown.reduce(
                (sum, chain) => sum + chain.percentage,
                0
              );

              // Should be approximately 100% (within 0.1%)
              if (Math.abs(percentageSum - 100) > 0.1) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should only include crypto payments in aggregation', () => {
      fc.assert(
        fc.property(
          fc.array(mixedEntryArb, { minLength: 1, maxLength: 50 }),
          (entries) => {
            const result = aggregateStablecoinIncome(entries);

            // Calculate expected crypto total manually
            const expectedCryptoTotal = entries
              .filter(e => e.paymentMethod === 'crypto_usdc' || e.paymentMethod === 'crypto_usdt')
              .reduce((sum, e) => sum.add(e.amountInDefaultCurrency), new Decimal(0));

            return result.totalStablecoinIncome.equals(expectedCryptoTotal);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('USDC entries should be aggregated under USDC asset', () => {
      fc.assert(
        fc.property(
          fc.array(cryptoEntryArb, { minLength: 1, maxLength: 50 }),
          (entries) => {
            const result = aggregateStablecoinIncome(entries);

            // Calculate expected USDC total
            const expectedUsdcTotal = entries
              .filter(e => e.paymentMethod === 'crypto_usdc')
              .reduce((sum, e) => sum.add(e.amountInDefaultCurrency), new Decimal(0));

            const usdcAgg = result.byAsset.find(a => a.asset === 'USDC');
            const actualUsdcTotal = usdcAgg?.totalAmount || new Decimal(0);

            return actualUsdcTotal.equals(expectedUsdcTotal);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('USDT entries should be aggregated under USDT asset', () => {
      fc.assert(
        fc.property(
          fc.array(cryptoEntryArb, { minLength: 1, maxLength: 50 }),
          (entries) => {
            const result = aggregateStablecoinIncome(entries);

            // Calculate expected USDT total
            const expectedUsdtTotal = entries
              .filter(e => e.paymentMethod === 'crypto_usdt')
              .reduce((sum, e) => sum.add(e.amountInDefaultCurrency), new Decimal(0));

            const usdtAgg = result.byAsset.find(a => a.asset === 'USDT');
            const actualUsdtTotal = usdtAgg?.totalAmount || new Decimal(0);

            return actualUsdtTotal.equals(expectedUsdtTotal);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('empty entries should return zero totals', () => {
      const result = aggregateStablecoinIncome([]);
      expect(result.totalStablecoinIncome.equals(new Decimal(0))).toBe(true);
      expect(result.byAsset).toEqual([]);
    });

    it('chain breakdown should be sorted by amount descending', () => {
      fc.assert(
        fc.property(
          fc.array(cryptoEntryArb, { minLength: 2, maxLength: 50 }),
          (entries) => {
            const result = aggregateStablecoinIncome(entries);

            for (const assetAgg of result.byAsset) {
              for (let i = 1; i < assetAgg.chainBreakdown.length; i++) {
                if (assetAgg.chainBreakdown[i].amount.greaterThan(
                  assetAgg.chainBreakdown[i - 1].amount
                )) {
                  return false;
                }
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('byAsset should be sorted by totalAmount descending', () => {
      fc.assert(
        fc.property(
          fc.array(cryptoEntryArb, { minLength: 2, maxLength: 50 }),
          (entries) => {
            const result = aggregateStablecoinIncome(entries);

            for (let i = 1; i < result.byAsset.length; i++) {
              if (result.byAsset[i].totalAmount.greaterThan(
                result.byAsset[i - 1].totalAmount
              )) {
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
