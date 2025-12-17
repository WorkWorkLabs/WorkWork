import { describe, it } from 'vitest';
import { fc } from './fc-config';
import Decimal from 'decimal.js';
import {
  currencyArb,
  chainArb,
  stablecoinAssetArb,
  paymentMethodArb,
  invoiceStatusArb,
  decimalArb,
  quantityArb,
  unitPriceArb,
  taxRateArb,
  moneyArb,
  lineItemArb,
  clientArb,
  projectArb,
  invoiceArb,
  ledgerEntryArb,
} from './arbitraries';
import { CURRENCIES, CHAINS, STABLECOIN_ASSETS, PAYMENT_METHODS, INVOICE_STATUSES } from '@/types/domain';

describe('Test Arbitraries', () => {
  describe('Primitive Arbitraries', () => {
    it('currencyArb generates valid currencies', () => {
      fc.assert(
        fc.property(currencyArb, (currency) => {
          return CURRENCIES.includes(currency);
        })
      );
    });

    it('chainArb generates valid chains', () => {
      fc.assert(
        fc.property(chainArb, (chain) => {
          return CHAINS.includes(chain);
        })
      );
    });

    it('stablecoinAssetArb generates valid assets', () => {
      fc.assert(
        fc.property(stablecoinAssetArb, (asset) => {
          return STABLECOIN_ASSETS.includes(asset);
        })
      );
    });

    it('paymentMethodArb generates valid payment methods', () => {
      fc.assert(
        fc.property(paymentMethodArb, (method) => {
          return PAYMENT_METHODS.includes(method);
        })
      );
    });

    it('invoiceStatusArb generates valid statuses', () => {
      fc.assert(
        fc.property(invoiceStatusArb, (status) => {
          return INVOICE_STATUSES.includes(status);
        })
      );
    });
  });

  describe('Decimal Arbitraries', () => {
    it('decimalArb generates values within range', () => {
      fc.assert(
        fc.property(decimalArb(1, 100, 2), (d) => {
          return d.gte(1) && d.lte(100);
        })
      );
    });

    it('quantityArb generates positive quantities', () => {
      fc.assert(
        fc.property(quantityArb, (q) => {
          return q.gt(0) && q.lte(1000);
        })
      );
    });

    it('unitPriceArb generates positive prices', () => {
      fc.assert(
        fc.property(unitPriceArb, (p) => {
          return p.gt(0) && p.lte(100000);
        })
      );
    });

    it('taxRateArb generates rates between 0 and 50%', () => {
      fc.assert(
        fc.property(taxRateArb, (r) => {
          return r.gte(0) && r.lte(0.5);
        })
      );
    });
  });

  describe('Money Arbitrary', () => {
    it('moneyArb generates valid money objects', () => {
      fc.assert(
        fc.property(moneyArb, (money) => {
          return (
            money.amount instanceof Decimal &&
            money.amount.gt(0) &&
            CURRENCIES.includes(money.currency)
          );
        })
      );
    });
  });

  describe('Entity Arbitraries', () => {
    it('lineItemArb generates items with correct total calculation', () => {
      fc.assert(
        fc.property(lineItemArb, (item) => {
          const expectedTotal = item.quantity.mul(item.unitPrice);
          return item.total.eq(expectedTotal);
        })
      );
    });

    it('clientArb generates valid clients', () => {
      fc.assert(
        fc.property(clientArb, (client) => {
          return (
            typeof client.id === 'string' &&
            typeof client.name === 'string' &&
            client.name.length > 0 &&
            typeof client.email === 'string'
          );
        })
      );
    });

    it('projectArb generates valid projects', () => {
      fc.assert(
        fc.property(projectArb, (project) => {
          return (
            typeof project.id === 'string' &&
            typeof project.name === 'string' &&
            project.name.length > 0
          );
        })
      );
    });

    it('invoiceArb generates invoices with correct calculations', () => {
      fc.assert(
        fc.property(invoiceArb, (invoice) => {
          // Verify subtotal is sum of line item totals
          const expectedSubtotal = invoice.lineItems.reduce(
            (sum, item) => sum.add(item.total),
            new Decimal(0)
          );
          
          // Verify tax amount
          const expectedTaxAmount = expectedSubtotal.mul(invoice.taxRate);
          
          // Verify total
          const expectedTotal = expectedSubtotal.add(expectedTaxAmount);
          
          return (
            invoice.subtotal.eq(expectedSubtotal) &&
            invoice.taxAmount.eq(expectedTaxAmount) &&
            invoice.total.eq(expectedTotal)
          );
        })
      );
    });

    it('ledgerEntryArb generates valid ledger entries', () => {
      fc.assert(
        fc.property(ledgerEntryArb, (entry) => {
          return (
            entry.amount instanceof Decimal &&
            entry.amount.gt(0) &&
            entry.amountInDefaultCurrency instanceof Decimal &&
            CURRENCIES.includes(entry.currency) &&
            PAYMENT_METHODS.includes(entry.paymentMethod)
          );
        })
      );
    });
  });
});
