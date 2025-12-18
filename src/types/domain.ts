import Decimal from 'decimal.js';

// Currency types
export type Currency = 'USD' | 'EUR' | 'HKD' | 'GBP' | 'JPY';
export const CURRENCIES: Currency[] = ['USD', 'EUR', 'HKD', 'GBP', 'JPY'];

// Blockchain types
export type Chain = 'arbitrum' | 'base' | 'polygon';
export const CHAINS: Chain[] = ['arbitrum', 'base', 'polygon'];

export type StablecoinAsset = 'USDC' | 'USDT';
export const STABLECOIN_ASSETS: StablecoinAsset[] = ['USDC', 'USDT'];

// Payment types
export type PaymentMethod = 'card' | 'bank_transfer' | 'crypto_usdc' | 'crypto_usdt';
export const PAYMENT_METHODS: PaymentMethod[] = ['card', 'bank_transfer', 'crypto_usdc', 'crypto_usdt'];

// Invoice status
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export const INVOICE_STATUSES: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];

// Money value object
export interface Money {
  amount: Decimal;
  currency: Currency;
}

// Line item
export interface LineItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: Decimal;
  unitPrice: Decimal;
  total: Decimal;
  sortOrder: number;
}

// Invoice entity
export interface Invoice {
  id: string;
  userId: string;
  clientId: string;
  projectId?: string;
  invoiceNumber: string;
  paymentToken: string;
  currency: Currency;
  issueDate: Date;
  dueDate: Date;
  lineItems: LineItem[];
  subtotal: Decimal;
  taxRate: Decimal;
  taxAmount: Decimal;
  total: Decimal;
  status: InvoiceStatus;
  notes?: string;
  allowCardPayment: boolean;
  allowCryptoPayment: boolean;
  sentAt?: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Ledger entry
export interface LedgerEntry {
  id: string;
  userId: string;
  invoiceId: string;
  clientId: string;
  projectId?: string;
  entryDate: Date;
  amount: Decimal;
  currency: Currency;
  amountInDefaultCurrency: Decimal;
  paymentMethod: PaymentMethod;
  clientCountry: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

// Wallet address
export interface WalletAddress {
  address: string;
  chain: Chain;
  asset: StablecoinAsset;
  createdAt: Date;
}

// Client entity
export interface Client {
  id: string;
  userId: string;
  name: string;
  email: string;
  company?: string;
  country?: string;
  notes?: string;
  active: boolean;
  createdAt: Date;
}

// Project entity
export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  archived: boolean;
  createdAt: Date;
}
