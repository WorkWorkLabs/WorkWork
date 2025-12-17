import Decimal from 'decimal.js';
import type { Invoice, LedgerEntry, LineItem } from '@/types/domain';

// ============================================
// JSON Serialization Types
// ============================================

/**
 * Serialized line item with string amounts for JSON storage
 */
interface SerializedLineItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  total: string;
  sortOrder: number;
}

/**
 * Serialized invoice with string amounts for JSON storage
 */
interface SerializedInvoice {
  id: string;
  userId: string;
  clientId: string;
  projectId?: string;
  invoiceNumber: string;
  paymentToken: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  lineItems: SerializedLineItem[];
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  total: string;
  status: string;
  notes?: string;
  allowCardPayment: boolean;
  allowCryptoPayment: boolean;
  sentAt?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Serialized ledger entry with string amounts for JSON storage
 */
interface SerializedLedgerEntry {
  id: string;
  userId: string;
  invoiceId: string;
  clientId: string;
  projectId?: string;
  entryDate: string;
  amount: string;
  currency: string;
  amountInDefaultCurrency: string;
  paymentMethod: string;
  clientCountry: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}


// ============================================
// Line Item Serialization
// ============================================

/**
 * Serialize a line item to JSON-safe format
 * Converts Decimal values to strings to preserve precision
 */
export function serializeLineItem(item: LineItem): SerializedLineItem {
  return {
    id: item.id,
    invoiceId: item.invoiceId,
    description: item.description,
    quantity: item.quantity.toString(),
    unitPrice: item.unitPrice.toString(),
    total: item.total.toString(),
    sortOrder: item.sortOrder,
  };
}

/**
 * Deserialize a line item from JSON format
 * Converts string amounts back to Decimal
 */
export function deserializeLineItem(data: SerializedLineItem): LineItem {
  return {
    id: data.id,
    invoiceId: data.invoiceId,
    description: data.description,
    quantity: new Decimal(data.quantity),
    unitPrice: new Decimal(data.unitPrice),
    total: new Decimal(data.total),
    sortOrder: data.sortOrder,
  };
}

// ============================================
// Invoice Serialization
// ============================================

/**
 * Serialize an invoice to JSON-safe format
 * Converts Decimal values to strings and Date to ISO strings
 * **验证: 需求 10.1**
 */
export function serializeInvoice(invoice: Invoice): SerializedInvoice {
  return {
    id: invoice.id,
    userId: invoice.userId,
    clientId: invoice.clientId,
    projectId: invoice.projectId,
    invoiceNumber: invoice.invoiceNumber,
    paymentToken: invoice.paymentToken,
    currency: invoice.currency,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    lineItems: invoice.lineItems.map(serializeLineItem),
    subtotal: invoice.subtotal.toString(),
    taxRate: invoice.taxRate.toString(),
    taxAmount: invoice.taxAmount.toString(),
    total: invoice.total.toString(),
    status: invoice.status,
    notes: invoice.notes,
    allowCardPayment: invoice.allowCardPayment,
    allowCryptoPayment: invoice.allowCryptoPayment,
    sentAt: invoice.sentAt?.toISOString(),
    paidAt: invoice.paidAt?.toISOString(),
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
  };
}

/**
 * Deserialize an invoice from JSON format
 * Converts string amounts back to Decimal and ISO strings to Date
 * **验证: 需求 10.2**
 */
export function deserializeInvoice(data: SerializedInvoice): Invoice {
  return {
    id: data.id,
    userId: data.userId,
    clientId: data.clientId,
    projectId: data.projectId,
    invoiceNumber: data.invoiceNumber,
    paymentToken: data.paymentToken,
    currency: data.currency as Invoice['currency'],
    issueDate: new Date(data.issueDate),
    dueDate: new Date(data.dueDate),
    lineItems: data.lineItems.map(deserializeLineItem),
    subtotal: new Decimal(data.subtotal),
    taxRate: new Decimal(data.taxRate),
    taxAmount: new Decimal(data.taxAmount),
    total: new Decimal(data.total),
    status: data.status as Invoice['status'],
    notes: data.notes,
    allowCardPayment: data.allowCardPayment,
    allowCryptoPayment: data.allowCryptoPayment,
    sentAt: data.sentAt ? new Date(data.sentAt) : undefined,
    paidAt: data.paidAt ? new Date(data.paidAt) : undefined,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}


// ============================================
// Ledger Entry Serialization
// ============================================

/**
 * Serialize a ledger entry to JSON-safe format
 * Converts Decimal values to strings and Date to ISO strings
 * **验证: 需求 10.3**
 */
export function serializeLedgerEntry(entry: LedgerEntry): SerializedLedgerEntry {
  return {
    id: entry.id,
    userId: entry.userId,
    invoiceId: entry.invoiceId,
    clientId: entry.clientId,
    projectId: entry.projectId,
    entryDate: entry.entryDate.toISOString(),
    amount: entry.amount.toString(),
    currency: entry.currency,
    amountInDefaultCurrency: entry.amountInDefaultCurrency.toString(),
    paymentMethod: entry.paymentMethod,
    clientCountry: entry.clientCountry,
    metadata: entry.metadata,
    createdAt: entry.createdAt.toISOString(),
  };
}

/**
 * Deserialize a ledger entry from JSON format
 * Converts string amounts back to Decimal and ISO strings to Date
 * **验证: 需求 10.4**
 */
export function deserializeLedgerEntry(data: SerializedLedgerEntry): LedgerEntry {
  return {
    id: data.id,
    userId: data.userId,
    invoiceId: data.invoiceId,
    clientId: data.clientId,
    projectId: data.projectId,
    entryDate: new Date(data.entryDate),
    amount: new Decimal(data.amount),
    currency: data.currency as LedgerEntry['currency'],
    amountInDefaultCurrency: new Decimal(data.amountInDefaultCurrency),
    paymentMethod: data.paymentMethod as LedgerEntry['paymentMethod'],
    clientCountry: data.clientCountry,
    metadata: data.metadata,
    createdAt: new Date(data.createdAt),
  };
}

// ============================================
// Decimal Serialization Helpers
// ============================================

/**
 * Serialize a Decimal to string for JSON storage
 * **验证: 需求 10.5**
 */
export function serializeDecimal(value: Decimal): string {
  return value.toString();
}

/**
 * Deserialize a string back to Decimal
 * **验证: 需求 10.5**
 */
export function deserializeDecimal(value: string): Decimal {
  return new Decimal(value);
}

// ============================================
// JSON Round-Trip Helpers
// ============================================

/**
 * Serialize invoice to JSON string
 */
export function invoiceToJson(invoice: Invoice): string {
  return JSON.stringify(serializeInvoice(invoice));
}

/**
 * Deserialize invoice from JSON string
 */
export function invoiceFromJson(json: string): Invoice {
  return deserializeInvoice(JSON.parse(json));
}

/**
 * Serialize ledger entry to JSON string
 */
export function ledgerEntryToJson(entry: LedgerEntry): string {
  return JSON.stringify(serializeLedgerEntry(entry));
}

/**
 * Deserialize ledger entry from JSON string
 */
export function ledgerEntryFromJson(json: string): LedgerEntry {
  return deserializeLedgerEntry(JSON.parse(json));
}
