/**
 * Payment Gateway tests
 * Tests for payment gateway abstraction layer
 * _需求: 6.2, 6.4, 2.2, 2.5_
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Decimal from 'decimal.js';
import {
  PaymentError,
  PaymentErrorCodes,
  type PSPCredentials,
  type CheckoutParams,
} from './types';
import { StripeAdapter } from './stripe-adapter';
import { getPaymentGateway, isProviderSupported } from './gateway-factory';
import { encryptCredentials, decryptCredentials } from './credentials';

describe('Payment Gateway Types', () => {
  it('should have correct error codes', () => {
    expect(PaymentErrorCodes.INVALID_CREDENTIALS).toBe('PAYMENT_INVALID_CREDENTIALS');
    expect(PaymentErrorCodes.CHECKOUT_FAILED).toBe('PAYMENT_CHECKOUT_FAILED');
    expect(PaymentErrorCodes.WEBHOOK_VERIFICATION_FAILED).toBe('PAYMENT_WEBHOOK_VERIFICATION_FAILED');
    expect(PaymentErrorCodes.PAYMENT_NOT_FOUND).toBe('PAYMENT_NOT_FOUND');
    expect(PaymentErrorCodes.PROVIDER_ERROR).toBe('PAYMENT_PROVIDER_ERROR');
  });

  it('should create PaymentError with correct properties', () => {
    const error = new PaymentError(
      PaymentErrorCodes.CHECKOUT_FAILED,
      'Test error message',
      { detail: 'test' }
    );

    expect(error.code).toBe(PaymentErrorCodes.CHECKOUT_FAILED);
    expect(error.message).toBe('Test error message');
    expect(error.details).toEqual({ detail: 'test' });
    expect(error.name).toBe('PaymentError');
  });
});

describe('Gateway Factory', () => {
  it('should recognize supported providers', () => {
    expect(isProviderSupported('stripe')).toBe(true);
    expect(isProviderSupported('airwallex')).toBe(true);
    expect(isProviderSupported('unknown')).toBe(false);
  });

  it('should create Stripe adapter for stripe provider', () => {
    const credentials: PSPCredentials = {
      provider: 'stripe',
      apiKey: 'sk_test_123',
      webhookSecret: 'whsec_123',
    };

    const gateway = getPaymentGateway(credentials);
    expect(gateway.provider).toBe('stripe');
    expect(gateway).toBeInstanceOf(StripeAdapter);
  });

  it('should throw error for unsupported provider', () => {
    const credentials = {
      provider: 'unknown' as 'stripe',
      apiKey: 'test',
    };

    expect(() => getPaymentGateway(credentials)).toThrow(PaymentError);
  });

  it('should throw error for airwallex (not yet implemented)', () => {
    const credentials: PSPCredentials = {
      provider: 'airwallex',
      apiKey: 'test',
    };

    expect(() => getPaymentGateway(credentials)).toThrow('not yet implemented');
  });
});

describe('Stripe Adapter', () => {
  const validCredentials: PSPCredentials = {
    provider: 'stripe',
    apiKey: 'sk_test_123456789',
    webhookSecret: 'whsec_test_secret',
  };

  it('should create adapter with valid credentials', () => {
    const adapter = new StripeAdapter(validCredentials);
    expect(adapter.provider).toBe('stripe');
  });

  it('should throw error for non-stripe credentials', () => {
    const invalidCredentials = {
      provider: 'airwallex' as const,
      apiKey: 'test',
    };

    expect(() => new StripeAdapter(invalidCredentials)).toThrow(PaymentError);
  });

  it('should have createCheckoutSession method', () => {
    const adapter = new StripeAdapter(validCredentials);
    expect(typeof adapter.createCheckoutSession).toBe('function');
  });

  it('should have verifyWebhook method', () => {
    const adapter = new StripeAdapter(validCredentials);
    expect(typeof adapter.verifyWebhook).toBe('function');
  });

  it('should have getPaymentStatus method', () => {
    const adapter = new StripeAdapter(validCredentials);
    expect(typeof adapter.getPaymentStatus).toBe('function');
  });

  it('should have validateCredentials method', () => {
    const adapter = new StripeAdapter(validCredentials);
    expect(typeof adapter.validateCredentials).toBe('function');
  });
});

describe('Credentials Encryption', () => {
  // Set up test encryption key
  const originalEnv = process.env.CREDENTIALS_ENCRYPTION_KEY;
  
  beforeAll(() => {
    process.env.CREDENTIALS_ENCRYPTION_KEY = 'test-encryption-key-32-chars-long!';
  });

  afterAll(() => {
    if (originalEnv) {
      process.env.CREDENTIALS_ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.CREDENTIALS_ENCRYPTION_KEY;
    }
  });

  it('should encrypt and decrypt credentials correctly', async () => {
    const credentials: PSPCredentials = {
      provider: 'stripe',
      apiKey: 'sk_test_secret_key_12345',
      webhookSecret: 'whsec_webhook_secret_67890',
    };

    const encrypted = await encryptCredentials(credentials);
    
    // Verify encrypted structure
    expect(encrypted.provider).toBe('stripe');
    expect(encrypted.encryptedApiKey).toBeDefined();
    expect(encrypted.encryptedApiKey).not.toBe(credentials.apiKey);
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.salt).toBeDefined();

    // Decrypt and verify
    const decrypted = await decryptCredentials(encrypted);
    expect(decrypted.provider).toBe(credentials.provider);
    expect(decrypted.apiKey).toBe(credentials.apiKey);
    expect(decrypted.webhookSecret).toBe(credentials.webhookSecret);
  });

  it('should encrypt credentials without webhook secret', async () => {
    const credentials: PSPCredentials = {
      provider: 'stripe',
      apiKey: 'sk_test_only_api_key',
    };

    const encrypted = await encryptCredentials(credentials);
    expect(encrypted.encryptedWebhookSecret).toBeUndefined();

    const decrypted = await decryptCredentials(encrypted);
    expect(decrypted.apiKey).toBe(credentials.apiKey);
    expect(decrypted.webhookSecret).toBeUndefined();
  });

  it('should produce different encrypted values for same input', async () => {
    const credentials: PSPCredentials = {
      provider: 'stripe',
      apiKey: 'sk_test_same_key',
    };

    const encrypted1 = await encryptCredentials(credentials);
    const encrypted2 = await encryptCredentials(credentials);

    // Different salt and IV should produce different encrypted values
    expect(encrypted1.encryptedApiKey).not.toBe(encrypted2.encryptedApiKey);
    expect(encrypted1.salt).not.toBe(encrypted2.salt);
    expect(encrypted1.iv).not.toBe(encrypted2.iv);

    // But both should decrypt to same value
    const decrypted1 = await decryptCredentials(encrypted1);
    const decrypted2 = await decryptCredentials(encrypted2);
    expect(decrypted1.apiKey).toBe(decrypted2.apiKey);
  });
});

describe('CheckoutParams validation', () => {
  it('should accept valid checkout params', () => {
    const params: CheckoutParams = {
      invoiceId: 'inv_123',
      amount: new Decimal('100.00'),
      currency: 'USD',
      customerEmail: 'test@example.com',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel',
      metadata: { invoiceNumber: 'INV-001' },
    };

    expect(params.invoiceId).toBe('inv_123');
    expect(params.amount.toString()).toBe('100');
    expect(params.currency).toBe('USD');
  });
});
