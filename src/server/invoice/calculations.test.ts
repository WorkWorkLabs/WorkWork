/**
 * Property tests for Invoice Calculations
 * **Feature: workwork-ledger-mvp**
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */

import { describe, it } from 'vitest';
import { fc } from '@/test/fc-config';
import Decimal from 'decimal.js';
import {
  calculateLineItemTotal,
  calculateLineItem,
  calculateSubtotal,
  calculateTaxAmount,
  calculateTotal,
  calculateInvoice,
  type CalculatedLineItem,
} from './calculations';

// Custom arbitraries for invoice calculations
const quantityArb = fc
  .integer({ min: 1, max: 100000 })
  .map((n) => new Decimal(n).div(100)); // 0.01 to 1000.00

const unitPriceArb = fc
  .integer({ min: 1, max: 10000000 })
  .map((n) => new Decimal(n).div(100)); // 0.01 to 100000.00

const taxRateArb = fc
  .integer({ min: 0, max: 5000 })
  .map((n) => new Decimal(n).div(10000)); // 0 to 0.5 (0% to 50%)

const lineItemInputArb = fc.record({
  description: fc.string({ minLength: 1, maxLength: 100 }),
  quantity: quantityArb,
  unitPrice: unitPriceArb,
});

describe('Invoice Calculations', () => {
  /**
   * **Feature: workwork-ledger-mvp, Property 4: 明细项金额计算**
   * *对于任意*明细项，其 total 应等于 quantity × unitPrice
   * **Validates: Requirements 5.2**
   */
  describe('Property 4: Line Item Total Calculation', () => {
    it('line item total equals quantity × unitPrice', () => {
      fc.assert(
        fc.property(quantityArb, unitPriceArb, (quantity, unitPrice) => {
          const total = calculateLineItemTotal(quantity, unitPrice);
          const expected = quantity.mul(unitPrice);
          return total.eq(expected);
        }),
        { numRuns: 100 }
      );
    });

    it('calculateLineItem produces correct total', () => {
      fc.assert(
        fc.property(lineItemInputArb, (input) => {
          const result = calculateLineItem(input);
          const expectedTotal = new Decimal(input.quantity).mul(new Decimal(input.unitPrice));
          return result.total.eq(expectedTotal);
        }),
        { numRuns: 100 }
      );
    });

    it('line item total is non-negative for positive inputs', () => {
      fc.assert(
        fc.property(quantityArb, unitPriceArb, (quantity, unitPrice) => {
          const total = calculateLineItemTotal(quantity, unitPrice);
          return total.gte(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: workwork-ledger-mvp, Property 5: 发票小计计算**
   * *对于任意*发票，其 subtotal 应等于所有明细项 total 之和
   * **Validates: Requirements 5.1**
   */
  describe('Property 5: Invoice Subtotal Calculation', () => {
    it('subtotal equals sum of all line item totals', () => {
      fc.assert(
        fc.property(
          fc.array(lineItemInputArb, { minLength: 1, maxLength: 20 }),
          (lineItemInputs) => {
            const lineItems = lineItemInputs.map(calculateLineItem);
            const subtotal = calculateSubtotal(lineItems);

            // Calculate expected sum manually
            const expectedSum = lineItems.reduce((sum, item) => sum.add(item.total), new Decimal(0));

            return subtotal.eq(expectedSum);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('subtotal is zero for empty line items', () => {
      const lineItems: CalculatedLineItem[] = [];
      const subtotal = calculateSubtotal(lineItems);
      return subtotal.eq(0);
    });

    it('subtotal is non-negative for positive line items', () => {
      fc.assert(
        fc.property(
          fc.array(lineItemInputArb, { minLength: 1, maxLength: 20 }),
          (lineItemInputs) => {
            const lineItems = lineItemInputs.map(calculateLineItem);
            const subtotal = calculateSubtotal(lineItems);
            return subtotal.gte(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: workwork-ledger-mvp, Property 6: 发票税额计算**
   * *对于任意*发票，其 taxAmount 应等于 subtotal × taxRate
   * **Validates: Requirements 5.3**
   */
  describe('Property 6: Invoice Tax Amount Calculation', () => {
    it('tax amount equals subtotal × taxRate', () => {
      fc.assert(
        fc.property(
          fc.array(lineItemInputArb, { minLength: 1, maxLength: 20 }),
          taxRateArb,
          (lineItemInputs, taxRate) => {
            const lineItems = lineItemInputs.map(calculateLineItem);
            const subtotal = calculateSubtotal(lineItems);
            const taxAmount = calculateTaxAmount(subtotal, taxRate);

            const expectedTax = subtotal.mul(taxRate);
            return taxAmount.eq(expectedTax);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('tax amount is zero when tax rate is zero', () => {
      fc.assert(
        fc.property(
          fc.array(lineItemInputArb, { minLength: 1, maxLength: 20 }),
          (lineItemInputs) => {
            const lineItems = lineItemInputs.map(calculateLineItem);
            const subtotal = calculateSubtotal(lineItems);
            const taxAmount = calculateTaxAmount(subtotal, new Decimal(0));
            return taxAmount.eq(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('tax amount is non-negative for non-negative inputs', () => {
      fc.assert(
        fc.property(
          fc.array(lineItemInputArb, { minLength: 1, maxLength: 20 }),
          taxRateArb,
          (lineItemInputs, taxRate) => {
            const lineItems = lineItemInputs.map(calculateLineItem);
            const subtotal = calculateSubtotal(lineItems);
            const taxAmount = calculateTaxAmount(subtotal, taxRate);
            return taxAmount.gte(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: workwork-ledger-mvp, Property 7: 发票总额计算**
   * *对于任意*发票，其 total 应等于 subtotal + taxAmount
   * **Validates: Requirements 5.1, 5.3**
   */
  describe('Property 7: Invoice Total Calculation', () => {
    it('total equals subtotal + taxAmount', () => {
      fc.assert(
        fc.property(
          fc.array(lineItemInputArb, { minLength: 1, maxLength: 20 }),
          taxRateArb,
          (lineItemInputs, taxRate) => {
            const lineItems = lineItemInputs.map(calculateLineItem);
            const subtotal = calculateSubtotal(lineItems);
            const taxAmount = calculateTaxAmount(subtotal, taxRate);
            const total = calculateTotal(subtotal, taxAmount);

            const expectedTotal = subtotal.add(taxAmount);
            return total.eq(expectedTotal);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('calculateInvoice produces consistent totals', () => {
      fc.assert(
        fc.property(
          fc.array(lineItemInputArb, { minLength: 1, maxLength: 20 }),
          taxRateArb,
          (lineItemInputs, taxRate) => {
            const result = calculateInvoice(lineItemInputs, taxRate);

            // Verify all calculations are consistent
            const expectedSubtotal = result.lineItems.reduce(
              (sum, item) => sum.add(item.total),
              new Decimal(0)
            );
            const expectedTaxAmount = expectedSubtotal.mul(result.taxRate);
            const expectedTotal = expectedSubtotal.add(expectedTaxAmount);

            return (
              result.subtotal.eq(expectedSubtotal) &&
              result.taxAmount.eq(expectedTaxAmount) &&
              result.total.eq(expectedTotal)
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('total equals subtotal when tax rate is zero', () => {
      fc.assert(
        fc.property(
          fc.array(lineItemInputArb, { minLength: 1, maxLength: 20 }),
          (lineItemInputs) => {
            const result = calculateInvoice(lineItemInputs, 0);
            return result.total.eq(result.subtotal);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('total is greater than or equal to subtotal', () => {
      fc.assert(
        fc.property(
          fc.array(lineItemInputArb, { minLength: 1, maxLength: 20 }),
          taxRateArb,
          (lineItemInputs, taxRate) => {
            const result = calculateInvoice(lineItemInputs, taxRate);
            return result.total.gte(result.subtotal);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
