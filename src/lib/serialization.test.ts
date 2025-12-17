import { describe, it } from 'vitest';
import { fc } from '@/test/fc-config';
import {
  invoiceArb,
  ledgerEntryArb,
  decimalArb,
} from '@/test/arbitraries';
import {
  serializeInvoice,
  deserializeInvoice,
  serializeLedgerEntry,
  deserializeLedgerEntry,
  serializeDecimal,
  deserializeDecimal,
  invoiceToJson,
  invoiceFromJson,
  ledgerEntryToJson,
  ledgerEntryFromJson,
} from './serialization';

/**
 * Helper to compare two invoices for equality
 * Handles Decimal and Date comparisons
 */
function invoicesEqual(a: ReturnType<typeof deserializeInvoice>, b: ReturnType<typeof deserializeInvoice>): boolean {
  // Compare primitive fields
  if (a.id !== b.id) return false;
  if (a.userId !== b.userId) return false;
  if (a.clientId !== b.clientId) return false;
  if (a.projectId !== b.projectId) return false;
  if (a.invoiceNumber !== b.invoiceNumber) return false;
  if (a.paymentToken !== b.paymentToken) return false;
  if (a.currency !== b.currency) return false;
  if (a.status !== b.status) return false;
  if (a.notes !== b.notes) return false;
  if (a.allowCardPayment !== b.allowCardPayment) return false;
  if (a.allowCryptoPayment !== b.allowCryptoPayment) return false;

  // Compare Decimal fields
  if (!a.subtotal.eq(b.subtotal)) return false;
  if (!a.taxRate.eq(b.taxRate)) return false;
  if (!a.taxAmount.eq(b.taxAmount)) return false;
  if (!a.total.eq(b.total)) return false;

  // Compare Date fields (using ISO string for precision)
  if (a.issueDate.toISOString() !== b.issueDate.toISOString()) return false;
  if (a.dueDate.toISOString() !== b.dueDate.toISOString()) return false;
  if (a.createdAt.toISOString() !== b.createdAt.toISOString()) return false;
  if (a.updatedAt.toISOString() !== b.updatedAt.toISOString()) return false;
  if (a.sentAt?.toISOString() !== b.sentAt?.toISOString()) return false;
  if (a.paidAt?.toISOString() !== b.paidAt?.toISOString()) return false;

  // Compare line items
  if (a.lineItems.length !== b.lineItems.length) return false;
  for (let i = 0; i < a.lineItems.length; i++) {
    const itemA = a.lineItems[i];
    const itemB = b.lineItems[i];
    if (itemA.id !== itemB.id) return false;
    if (itemA.invoiceId !== itemB.invoiceId) return false;
    if (itemA.description !== itemB.description) return false;
    if (!itemA.quantity.eq(itemB.quantity)) return false;
    if (!itemA.unitPrice.eq(itemB.unitPrice)) return false;
    if (!itemA.total.eq(itemB.total)) return false;
    if (itemA.sortOrder !== itemB.sortOrder) return false;
  }

  return true;
}


/**
 * Helper to compare two ledger entries for equality
 */
function ledgerEntriesEqual(
  a: ReturnType<typeof deserializeLedgerEntry>,
  b: ReturnType<typeof deserializeLedgerEntry>
): boolean {
  // Compare primitive fields
  if (a.id !== b.id) return false;
  if (a.userId !== b.userId) return false;
  if (a.invoiceId !== b.invoiceId) return false;
  if (a.clientId !== b.clientId) return false;
  if (a.projectId !== b.projectId) return false;
  if (a.currency !== b.currency) return false;
  if (a.paymentMethod !== b.paymentMethod) return false;
  if (a.clientCountry !== b.clientCountry) return false;

  // Compare Decimal fields
  if (!a.amount.eq(b.amount)) return false;
  if (!a.amountInDefaultCurrency.eq(b.amountInDefaultCurrency)) return false;

  // Compare Date fields
  if (a.entryDate.toISOString() !== b.entryDate.toISOString()) return false;
  if (a.createdAt.toISOString() !== b.createdAt.toISOString()) return false;

  // Compare metadata (simple JSON comparison)
  if (JSON.stringify(a.metadata) !== JSON.stringify(b.metadata)) return false;

  return true;
}

describe('Serialization Property Tests', () => {
  /**
   * **Feature: workwork-ledger-mvp, Property 25: 发票序列化 Round-Trip**
   * *对于任意*有效的发票对象，序列化为 JSON 后再反序列化应得到等价的发票对象
   * **验证: 需求 10.1, 10.2**
   */
  describe('Property 25: Invoice Serialization Round-Trip', () => {
    it('serialize then deserialize produces equivalent invoice', () => {
      fc.assert(
        fc.property(invoiceArb, (invoice) => {
          // Serialize to JSON-safe format
          const serialized = serializeInvoice(invoice);
          
          // Deserialize back
          const deserialized = deserializeInvoice(serialized);
          
          // Verify equality
          return invoicesEqual(invoice, deserialized);
        }),
        { numRuns: 100 }
      );
    });

    it('full JSON round-trip preserves invoice data', () => {
      fc.assert(
        fc.property(invoiceArb, (invoice) => {
          // Full JSON round-trip
          const json = invoiceToJson(invoice);
          const restored = invoiceFromJson(json);
          
          // Verify equality
          return invoicesEqual(invoice, restored);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: workwork-ledger-mvp, Property 26: 账本条目序列化 Round-Trip**
   * *对于任意*有效的账本条目，序列化后再反序列化应得到等价的条目，且金额精度不丢失
   * **验证: 需求 10.3, 10.4**
   */
  describe('Property 26: Ledger Entry Serialization Round-Trip', () => {
    it('serialize then deserialize produces equivalent ledger entry', () => {
      fc.assert(
        fc.property(ledgerEntryArb, (entry) => {
          // Serialize to JSON-safe format
          const serialized = serializeLedgerEntry(entry);
          
          // Deserialize back
          const deserialized = deserializeLedgerEntry(serialized);
          
          // Verify equality
          return ledgerEntriesEqual(entry, deserialized);
        }),
        { numRuns: 100 }
      );
    });

    it('full JSON round-trip preserves ledger entry data', () => {
      fc.assert(
        fc.property(ledgerEntryArb, (entry) => {
          // Full JSON round-trip
          const json = ledgerEntryToJson(entry);
          const restored = ledgerEntryFromJson(json);
          
          // Verify equality
          return ledgerEntriesEqual(entry, restored);
        }),
        { numRuns: 100 }
      );
    });

    it('amount precision is preserved after round-trip', () => {
      fc.assert(
        fc.property(ledgerEntryArb, (entry) => {
          const json = ledgerEntryToJson(entry);
          const restored = ledgerEntryFromJson(json);
          
          // Specifically verify amount precision
          return (
            entry.amount.eq(restored.amount) &&
            entry.amountInDefaultCurrency.eq(restored.amountInDefaultCurrency)
          );
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: workwork-ledger-mvp, Property 27: 货币金额精度保持**
   * *对于任意* Decimal 金额，序列化为字符串后再解析应得到相同的值
   * **验证: 需求 10.5**
   */
  describe('Property 27: Currency Amount Precision', () => {
    it('decimal serialization preserves precision', () => {
      fc.assert(
        fc.property(decimalArb(0.0001, 1000000, 8), (amount) => {
          // Serialize to string
          const serialized = serializeDecimal(amount);
          
          // Deserialize back
          const deserialized = deserializeDecimal(serialized);
          
          // Verify exact equality
          return amount.eq(deserialized);
        }),
        { numRuns: 100 }
      );
    });

    it('decimal precision is maintained through JSON', () => {
      fc.assert(
        fc.property(decimalArb(0.0001, 1000000, 8), (amount) => {
          // Full JSON round-trip
          const json = JSON.stringify(serializeDecimal(amount));
          const restored = deserializeDecimal(JSON.parse(json));
          
          // Verify exact equality
          return amount.eq(restored);
        }),
        { numRuns: 100 }
      );
    });

    it('very small amounts preserve precision', () => {
      fc.assert(
        fc.property(decimalArb(0.00000001, 0.001, 8), (amount) => {
          const serialized = serializeDecimal(amount);
          const deserialized = deserializeDecimal(serialized);
          return amount.eq(deserialized);
        }),
        { numRuns: 100 }
      );
    });

    it('very large amounts preserve precision', () => {
      fc.assert(
        fc.property(decimalArb(1000000, 999999999999, 2), (amount) => {
          const serialized = serializeDecimal(amount);
          const deserialized = deserializeDecimal(serialized);
          return amount.eq(deserialized);
        }),
        { numRuns: 100 }
      );
    });
  });
});
