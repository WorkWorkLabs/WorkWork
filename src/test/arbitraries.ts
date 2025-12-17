import { fc } from './fc-config';
import Decimal from 'decimal.js';
import {
  CURRENCIES,
  CHAINS,
  STABLECOIN_ASSETS,
  PAYMENT_METHODS,
  INVOICE_STATUSES,
  type Currency,
  type Chain,
  type StablecoinAsset,
  type PaymentMethod,
  type InvoiceStatus,
  type Money,
  type LineItem,
  type Invoice,
  type LedgerEntry,
  type Client,
  type Project,
} from '@/types/domain';

// ============================================
// Primitive Arbitraries
// ============================================

/**
 * Currency arbitrary - generates one of the supported currencies
 */
export const currencyArb = fc.constantFrom<Currency>(...CURRENCIES);

/**
 * Chain arbitrary - generates one of the supported blockchain networks
 */
export const chainArb = fc.constantFrom<Chain>(...CHAINS);

/**
 * Stablecoin asset arbitrary
 */
export const stablecoinAssetArb = fc.constantFrom<StablecoinAsset>(...STABLECOIN_ASSETS);

/**
 * Payment method arbitrary
 */
export const paymentMethodArb = fc.constantFrom<PaymentMethod>(...PAYMENT_METHODS);

/**
 * Invoice status arbitrary
 */
export const invoiceStatusArb = fc.constantFrom<InvoiceStatus>(...INVOICE_STATUSES);

// ============================================
// Decimal Arbitraries
// ============================================

/**
 * Decimal arbitrary with configurable range and precision
 * @param min Minimum value (default: 0.01)
 * @param max Maximum value (default: 1000000)
 * @param decimalPlaces Number of decimal places (default: 2)
 */
export const decimalArb = (
  min: number = 0.01,
  max: number = 1000000,
  decimalPlaces: number = 2
): fc.Arbitrary<Decimal> => {
  const multiplier = Math.pow(10, decimalPlaces);
  return fc
    .integer({ min: Math.floor(min * multiplier), max: Math.floor(max * multiplier) })
    .map((n) => new Decimal(n).div(multiplier));
};

/**
 * Positive decimal for quantities (0.01 to 1000)
 */
export const quantityArb = decimalArb(0.01, 1000, 2);

/**
 * Positive decimal for unit prices (0.01 to 100000)
 */
export const unitPriceArb = decimalArb(0.01, 100000, 2);

/**
 * Tax rate arbitrary (0% to 50%)
 */
export const taxRateArb = decimalArb(0, 0.5, 4);

/**
 * Exchange rate arbitrary (0.0001 to 1000)
 */
export const exchangeRateArb = decimalArb(0.0001, 1000, 6);

// ============================================
// Money Arbitrary
// ============================================

/**
 * Money value object arbitrary
 */
export const moneyArb: fc.Arbitrary<Money> = fc.record({
  amount: decimalArb(0.01, 1000000, 2),
  currency: currencyArb,
});

// ============================================
// Date Arbitraries
// ============================================

/**
 * Date arbitrary within a reasonable range
 * Uses integer timestamps to avoid NaN date issues
 */
const MIN_DATE_TS = new Date('2020-01-01T00:00:00.000Z').getTime();
const MAX_DATE_TS = new Date('2030-12-31T23:59:59.999Z').getTime();

export const dateArb: fc.Arbitrary<Date> = fc
  .integer({ min: MIN_DATE_TS, max: MAX_DATE_TS })
  .map((ts) => new Date(ts));

/**
 * Past date arbitrary (before today)
 */
export const pastDateArb: fc.Arbitrary<Date> = fc
  .integer({ min: MIN_DATE_TS, max: Date.now() })
  .map((ts) => new Date(ts));

/**
 * Future date arbitrary (after today)
 */
export const futureDateArb: fc.Arbitrary<Date> = fc
  .integer({ min: Date.now(), max: MAX_DATE_TS })
  .map((ts) => new Date(ts));

// ============================================
// Entity Arbitraries
// ============================================

/**
 * Line item input arbitrary (for creating line items)
 */
export const lineItemInputArb = fc.record({
  description: fc.string({ minLength: 1, maxLength: 200 }),
  quantity: quantityArb,
  unitPrice: unitPriceArb,
});

/**
 * Line item arbitrary (complete entity)
 */
export const lineItemArb: fc.Arbitrary<LineItem> = fc
  .record({
    id: fc.uuid(),
    invoiceId: fc.uuid(),
    description: fc.string({ minLength: 1, maxLength: 200 }),
    quantity: quantityArb,
    unitPrice: unitPriceArb,
    sortOrder: fc.nat({ max: 100 }),
  })
  .map((item) => ({
    ...item,
    total: item.quantity.mul(item.unitPrice),
  }));

/**
 * Client arbitrary
 */
export const clientArb: fc.Arbitrary<Client> = fc.record({
  id: fc.uuid(),
  userId: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  email: fc.emailAddress(),
  company: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  country: fc.option(fc.string({ minLength: 2, maxLength: 2 }), { nil: undefined }),
  notes: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  active: fc.boolean(),
  createdAt: dateArb,
});

/**
 * Project arbitrary
 */
export const projectArb: fc.Arbitrary<Project> = fc.record({
  id: fc.uuid(),
  userId: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  archived: fc.boolean(),
  createdAt: dateArb,
});

/**
 * Optional date arbitrary - generates either a valid date or undefined
 */
export const optionalDateArb: fc.Arbitrary<Date | undefined> = fc.oneof(
  fc.constant(undefined),
  dateArb
);

/**
 * Invoice arbitrary (complete entity)
 */
export const invoiceArb: fc.Arbitrary<Invoice> = fc
  .record({
    id: fc.uuid(),
    userId: fc.uuid(),
    clientId: fc.uuid(),
    projectId: fc.option(fc.uuid(), { nil: undefined }),
    invoiceNumber: fc.stringMatching(/^INV-[0-9]{6}$/),
    paymentToken: fc.uuid(),
    currency: currencyArb,
    issueDate: dateArb,
    dueDate: dateArb,
    lineItems: fc.array(lineItemArb, { minLength: 1, maxLength: 20 }),
    taxRate: taxRateArb,
    status: invoiceStatusArb,
    notes: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
    allowCardPayment: fc.boolean(),
    allowCryptoPayment: fc.boolean(),
    sentAt: optionalDateArb,
    paidAt: optionalDateArb,
    createdAt: dateArb,
    updatedAt: dateArb,
  })
  .map((invoice) => {
    const subtotal = invoice.lineItems.reduce(
      (sum, item) => sum.add(item.total),
      new Decimal(0)
    );
    const taxAmount = subtotal.mul(invoice.taxRate);
    const total = subtotal.add(taxAmount);
    return {
      ...invoice,
      subtotal,
      taxAmount,
      total,
    };
  });

/**
 * Ledger entry arbitrary
 */
export const ledgerEntryArb: fc.Arbitrary<LedgerEntry> = fc
  .record({
    id: fc.uuid(),
    userId: fc.uuid(),
    invoiceId: fc.uuid(),
    clientId: fc.uuid(),
    projectId: fc.option(fc.uuid(), { nil: undefined }),
    entryDate: dateArb,
    amount: decimalArb(0.01, 1000000, 2),
    currency: currencyArb,
    exchangeRate: exchangeRateArb,
    paymentMethod: paymentMethodArb,
    clientCountry: fc.string({ minLength: 2, maxLength: 2 }),
    metadata: fc.constant({}),
    createdAt: dateArb,
  })
  .map((entry) => ({
    id: entry.id,
    userId: entry.userId,
    invoiceId: entry.invoiceId,
    clientId: entry.clientId,
    projectId: entry.projectId,
    entryDate: entry.entryDate,
    amount: entry.amount,
    currency: entry.currency,
    amountInDefaultCurrency: entry.amount.mul(entry.exchangeRate),
    paymentMethod: entry.paymentMethod,
    clientCountry: entry.clientCountry,
    metadata: entry.metadata,
    createdAt: entry.createdAt,
  }));

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a list of line items with consistent invoice ID
 */
export const lineItemsForInvoiceArb = (invoiceId: string) =>
  fc.array(lineItemArb, { minLength: 1, maxLength: 20 }).map((items) =>
    items.map((item, index) => ({
      ...item,
      invoiceId,
      sortOrder: index,
    }))
  );

/**
 * Generate a valid invoice number
 */
export const invoiceNumberArb = fc.stringMatching(/^INV-[0-9]{6}$/);

/**
 * Generate a valid email address
 */
export const emailArb = fc.emailAddress();

/**
 * Generate a valid UUID
 */
export const uuidArb = fc.uuid();
