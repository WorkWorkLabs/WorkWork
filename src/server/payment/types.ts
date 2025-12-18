/**
 * Payment Gateway types and interfaces
 * _需求: 6.2, 6.4_
 */

import type { Currency } from '@prisma/client';
import Decimal from 'decimal.js';

/**
 * Payment status enum
 */
export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';

/**
 * PSP Provider type
 */
export type PSPProvider = 'stripe' | 'airwallex';

/**
 * Checkout session parameters
 * _需求: 6.2_
 */
export interface CheckoutParams {
  invoiceId: string;
  amount: Decimal;
  currency: Currency;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}

/**
 * Checkout session result
 */
export interface CheckoutSession {
  id: string;
  url: string;
  expiresAt: Date;
}

/**
 * Webhook event from PSP
 * _需求: 6.4_
 */
export interface WebhookEvent {
  id: string;
  type: string;
  data: {
    paymentId?: string;
    checkoutSessionId?: string;
    amount?: number;
    currency?: string;
    status?: PaymentStatus;
    metadata?: Record<string, string>;
  };
  createdAt: Date;
}

/**
 * PSP credentials for authentication
 * _需求: 2.2_
 */
export interface PSPCredentials {
  provider: PSPProvider;
  apiKey: string;
  webhookSecret?: string;
}

/**
 * Payment Gateway interface
 * Defines the contract for PSP adapters
 * _需求: 6.2, 6.4_
 */
export interface PaymentGateway {
  /**
   * Get the provider name
   */
  readonly provider: PSPProvider;

  /**
   * Create a checkout session for payment
   * _需求: 6.2_
   */
  createCheckoutSession(params: CheckoutParams): Promise<CheckoutSession>;

  /**
   * Verify webhook signature and parse event
   * _需求: 6.4_
   */
  verifyWebhook(payload: string | Buffer, signature: string): Promise<WebhookEvent>;

  /**
   * Get payment status by payment ID
   */
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;

  /**
   * Validate PSP credentials
   * _需求: 2.5_
   */
  validateCredentials(): Promise<boolean>;
}

/**
 * Payment gateway factory function type
 */
export type PaymentGatewayFactory = (credentials: PSPCredentials) => PaymentGateway;

/**
 * Error codes for payment operations
 */
export const PaymentErrorCodes = {
  INVALID_CREDENTIALS: 'PAYMENT_INVALID_CREDENTIALS',
  CHECKOUT_FAILED: 'PAYMENT_CHECKOUT_FAILED',
  WEBHOOK_VERIFICATION_FAILED: 'PAYMENT_WEBHOOK_VERIFICATION_FAILED',
  PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',
  PROVIDER_ERROR: 'PAYMENT_PROVIDER_ERROR',
} as const;

/**
 * Payment error class
 */
export class PaymentError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}
