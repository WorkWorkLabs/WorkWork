/**
 * Stripe Payment Gateway Adapter
 * _需求: 2.2, 6.2, 6.4_
 */

import type {
  PaymentGateway,
  CheckoutParams,
  CheckoutSession,
  WebhookEvent,
  PaymentStatus,
  PSPCredentials,
} from './types';
import { PaymentError, PaymentErrorCodes } from './types';

/**
 * Stripe API response types (minimal subset needed)
 */
interface StripeCheckoutSession {
  id: string;
  url: string | null;
  expires_at: number;
  payment_status: string;
  payment_intent?: string | { id: string };
}

interface StripePaymentIntent {
  id: string;
  status: string;
}

interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
  created: number;
}

/**
 * Map Stripe payment status to our PaymentStatus
 */
function mapStripeStatus(stripeStatus: string): PaymentStatus {
  switch (stripeStatus) {
    case 'paid':
    case 'complete':
    case 'succeeded':
      return 'succeeded';
    case 'unpaid':
    case 'no_payment_required':
    case 'requires_payment_method':
    case 'requires_confirmation':
    case 'requires_action':
      return 'pending';
    case 'processing':
      return 'processing';
    case 'canceled':
    case 'cancelled':
      return 'cancelled';
    default:
      return 'failed';
  }
}

/**
 * Stripe Payment Gateway implementation
 * _需求: 2.2, 6.2, 6.4_
 */
export class StripeAdapter implements PaymentGateway {
  readonly provider = 'stripe' as const;
  private readonly apiKey: string;
  private readonly webhookSecret: string;
  private readonly baseUrl = 'https://api.stripe.com/v1';

  constructor(credentials: PSPCredentials) {
    if (credentials.provider !== 'stripe') {
      throw new PaymentError(
        PaymentErrorCodes.INVALID_CREDENTIALS,
        'Invalid provider for Stripe adapter'
      );
    }
    this.apiKey = credentials.apiKey;
    this.webhookSecret = credentials.webhookSecret || '';
  }

  /**
   * Create a Stripe Checkout Session
   * _需求: 6.2_
   */
  async createCheckoutSession(params: CheckoutParams): Promise<CheckoutSession> {
    try {
      // Convert amount to cents (Stripe uses smallest currency unit)
      const amountInCents = params.amount.mul(100).toNumber();

      const body = new URLSearchParams({
        'mode': 'payment',
        'payment_method_types[0]': 'card',
        'line_items[0][price_data][currency]': params.currency.toLowerCase(),
        'line_items[0][price_data][unit_amount]': String(Math.round(amountInCents)),
        'line_items[0][price_data][product_data][name]': `Invoice ${params.metadata.invoiceNumber || params.invoiceId}`,
        'line_items[0][quantity]': '1',
        'customer_email': params.customerEmail,
        'success_url': params.successUrl,
        'cancel_url': params.cancelUrl,
        'metadata[invoiceId]': params.invoiceId,
      });

      // Add additional metadata
      Object.entries(params.metadata).forEach(([key, value]) => {
        body.append(`metadata[${key}]`, value);
      });

      const response = await fetch(`${this.baseUrl}/checkout/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new PaymentError(
          PaymentErrorCodes.CHECKOUT_FAILED,
          error.error?.message || 'Failed to create checkout session',
          { stripeError: error }
        );
      }

      const session: StripeCheckoutSession = await response.json();

      if (!session.url) {
        throw new PaymentError(
          PaymentErrorCodes.CHECKOUT_FAILED,
          'Checkout session created but no URL returned'
        );
      }

      return {
        id: session.id,
        url: session.url,
        expiresAt: new Date(session.expires_at * 1000),
      };
    } catch (error) {
      if (error instanceof PaymentError) throw error;
      throw new PaymentError(
        PaymentErrorCodes.PROVIDER_ERROR,
        `Stripe API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error }
      );
    }
  }

  /**
   * Verify Stripe webhook signature and parse event
   * _需求: 6.4_
   */
  async verifyWebhook(payload: string | Buffer, signature: string): Promise<WebhookEvent> {
    try {
      // Parse the Stripe-Signature header
      const signatureParts = signature.split(',').reduce((acc, part) => {
        const [key, value] = part.split('=');
        if (key && value) acc[key] = value;
        return acc;
      }, {} as Record<string, string>);

      const timestamp = signatureParts['t'];
      const expectedSignature = signatureParts['v1'];

      if (!timestamp || !expectedSignature) {
        throw new PaymentError(
          PaymentErrorCodes.WEBHOOK_VERIFICATION_FAILED,
          'Invalid webhook signature format'
        );
      }

      // Verify timestamp is within tolerance (5 minutes)
      const timestampAge = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10));
      if (timestampAge > 300) {
        throw new PaymentError(
          PaymentErrorCodes.WEBHOOK_VERIFICATION_FAILED,
          'Webhook timestamp too old'
        );
      }

      // Compute expected signature
      const payloadString = typeof payload === 'string' ? payload : payload.toString('utf8');
      const signedPayload = `${timestamp}.${payloadString}`;
      
      // Use Web Crypto API for HMAC-SHA256
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(this.webhookSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(signedPayload)
      );
      
      const computedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Constant-time comparison
      if (!this.secureCompare(computedSignature, expectedSignature)) {
        throw new PaymentError(
          PaymentErrorCodes.WEBHOOK_VERIFICATION_FAILED,
          'Webhook signature verification failed'
        );
      }

      // Parse the event
      const event: StripeWebhookEvent = JSON.parse(payloadString);

      return this.parseStripeEvent(event);
    } catch (error) {
      if (error instanceof PaymentError) throw error;
      throw new PaymentError(
        PaymentErrorCodes.WEBHOOK_VERIFICATION_FAILED,
        `Failed to verify webhook: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get payment status from Stripe
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    try {
      // First try to get as checkout session
      const sessionResponse = await fetch(`${this.baseUrl}/checkout/sessions/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (sessionResponse.ok) {
        const session: StripeCheckoutSession = await sessionResponse.json();
        return mapStripeStatus(session.payment_status);
      }

      // Try as payment intent
      const intentResponse = await fetch(`${this.baseUrl}/payment_intents/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (intentResponse.ok) {
        const intent: StripePaymentIntent = await intentResponse.json();
        return mapStripeStatus(intent.status);
      }

      throw new PaymentError(
        PaymentErrorCodes.PAYMENT_NOT_FOUND,
        `Payment not found: ${paymentId}`
      );
    } catch (error) {
      if (error instanceof PaymentError) throw error;
      throw new PaymentError(
        PaymentErrorCodes.PROVIDER_ERROR,
        `Failed to get payment status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate Stripe credentials by making a test API call
   * _需求: 2.5_
   */
  async validateCredentials(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/balance`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Parse Stripe webhook event to our WebhookEvent format
   */
  private parseStripeEvent(event: StripeWebhookEvent): WebhookEvent {
    const data = event.data.object;
    
    return {
      id: event.id,
      type: event.type,
      data: {
        paymentId: (data.payment_intent as string) || undefined,
        checkoutSessionId: (data.id as string) || undefined,
        amount: typeof data.amount_total === 'number' ? data.amount_total / 100 : undefined,
        currency: (data.currency as string)?.toUpperCase() || undefined,
        status: mapStripeStatus((data.payment_status as string) || (data.status as string) || ''),
        metadata: (data.metadata as Record<string, string>) || undefined,
      },
      createdAt: new Date(event.created * 1000),
    };
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}

/**
 * Create a Stripe adapter instance
 */
export function createStripeAdapter(credentials: PSPCredentials): StripeAdapter {
  return new StripeAdapter(credentials);
}
