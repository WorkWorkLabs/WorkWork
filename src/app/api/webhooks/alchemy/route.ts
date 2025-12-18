/**
 * Alchemy Webhook Endpoint
 * Handles Alchemy webhook events for USDC/USDT transfers
 * _需求: 6.5_
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { processAlchemyWebhook } from '@/server/payment/alchemy-webhook.handler';

/**
 * Verify Alchemy webhook signature
 * Alchemy uses HMAC-SHA256 for webhook signature verification
 */
function verifyAlchemySignature(
  payload: string,
  signature: string,
  signingKey: string
): boolean {
  try {
    const hmac = crypto.createHmac('sha256', signingKey);
    hmac.update(payload, 'utf8');
    const expectedSignature = hmac.digest('hex');
    
    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * POST /api/webhooks/alchemy
 * Receives and processes Alchemy webhook events for stablecoin transfers
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-alchemy-signature');

    // Get webhook signing key from environment
    const signingKey = process.env.ALCHEMY_WEBHOOK_SIGNING_KEY;
    
    // Verify signature if signing key is configured
    if (signingKey && signature) {
      const isValid = verifyAlchemySignature(rawBody, signature, signingKey);
      if (!isValid) {
        console.error('[Alchemy Webhook] Invalid signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    } else if (signingKey && !signature) {
      console.error('[Alchemy Webhook] Missing signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Parse the webhook payload
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      console.error('[Alchemy Webhook] Invalid JSON payload');
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    console.log(`[Alchemy Webhook] Received event: ${payload.type || 'unknown'}`);

    // Process the webhook
    const result = await processAlchemyWebhook(payload);

    if (!result.success) {
      console.error(`[Alchemy Webhook] Processing failed: ${result.error}`);
      // Still return 200 to acknowledge receipt (prevent retries for business logic errors)
      return NextResponse.json({ received: true, processed: false, error: result.error });
    }

    return NextResponse.json({ received: true, processed: true });
  } catch (error) {
    console.error('[Alchemy Webhook] Error processing webhook:', error);
    
    // Return 500 for unexpected errors (Alchemy will retry)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
