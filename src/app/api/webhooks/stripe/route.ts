/**
 * Stripe Webhook Endpoint
 * Handles Stripe webhook events with signature verification and idempotency
 * _需求: 6.4_
 */

import { NextRequest, NextResponse } from 'next/server';
import { StripeAdapter } from '@/server/payment/stripe-adapter';
import {
  processWebhookWithIdempotency,
  extractInvoiceIdFromEvent,
  isPaymentSuccessEvent,
  isPaymentFailedEvent,
} from '@/server/payment/webhook.service';
import {
  handlePaymentSuccess,
  handlePaymentFailure,
} from '@/server/payment/webhook.handlers';
import { PaymentError, PaymentErrorCodes } from '@/server/payment/types';

/**
 * POST /api/webhooks/stripe
 * Receives and processes Stripe webhook events
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('[Stripe Webhook] Missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Get webhook secret from environment
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      );
    }

    // Create Stripe adapter for webhook verification
    const stripeAdapter = new StripeAdapter({
      provider: 'stripe',
      apiKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret,
    });

    // Verify webhook signature and parse event
    let event;
    try {
      event = await stripeAdapter.verifyWebhook(rawBody, signature);
    } catch (error) {
      if (error instanceof PaymentError && error.code === PaymentErrorCodes.WEBHOOK_VERIFICATION_FAILED) {
        console.error('[Stripe Webhook] Signature verification failed:', error.message);
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 400 }
        );
      }
      throw error;
    }

    console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

    // Process with idempotency check
    const { alreadyProcessed } = await processWebhookWithIdempotency(
      'stripe',
      event.id,
      async () => {
        // Extract invoice ID from event metadata
        const invoiceId = extractInvoiceIdFromEvent(event);

        if (!invoiceId) {
          console.log(`[Stripe Webhook] Event ${event.id} has no invoiceId in metadata, skipping`);
          return { skipped: true };
        }

        // Handle payment success events
        if (isPaymentSuccessEvent(event.type)) {
          console.log(`[Stripe Webhook] Processing payment success for invoice ${invoiceId}`);
          const result = await handlePaymentSuccess(invoiceId, {
            pspProvider: 'stripe',
            pspPaymentId: event.data.paymentId,
            checkoutSessionId: event.data.checkoutSessionId,
            amount: event.data.amount,
            currency: event.data.currency,
          });
          return result;
        }

        // Handle payment failure events
        if (isPaymentFailedEvent(event.type)) {
          console.log(`[Stripe Webhook] Processing payment failure for invoice ${invoiceId}`);
          const result = await handlePaymentFailure(invoiceId, {
            eventType: event.type,
            pspProvider: 'stripe',
            errorMessage: `Payment ${event.type.replace('_', ' ')}`,
          });
          return result;
        }

        // Unhandled event type
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        return { skipped: true, reason: 'unhandled_event_type' };
      }
    );

    if (alreadyProcessed) {
      console.log(`[Stripe Webhook] Event ${event.id} already processed, skipping`);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error processing webhook:', error);
    
    // Return 500 for unexpected errors (Stripe will retry)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
