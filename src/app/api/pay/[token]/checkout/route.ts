import { NextRequest, NextResponse } from 'next/server';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/prisma';
import { validatePaymentToken } from '@/server/payment/payment-link';
import { getPSPCredentials } from '@/server/payment/credentials';
import { getPaymentGateway } from '@/server/payment/gateway-factory';
import type { Currency } from '@prisma/client';

/**
 * POST /api/pay/[token]/checkout
 * Creates a Stripe Checkout session and returns the redirect URL
 * _需求: 6.2_
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { method } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Invalid payment token' },
        { status: 400 }
      );
    }

    if (method !== 'card') {
      return NextResponse.json(
        { error: 'Only card payment is currently supported' },
        { status: 400 }
      );
    }

    // Validate the payment token and get invoice
    const result = await validatePaymentToken(token);

    if (!result.valid) {
      const errorMessages: Record<string, string> = {
        not_found: 'Invoice not found',
        expired: 'Payment link has expired',
        already_paid: 'Invoice has already been paid',
        cancelled: 'Invoice has been cancelled',
      };
      return NextResponse.json(
        { error: errorMessages[result.error] || 'Invalid payment link' },
        { status: 400 }
      );
    }

    const { invoice } = result;

    // Check if card payment is allowed
    if (!invoice.allowCardPayment) {
      return NextResponse.json(
        { error: 'Card payment is not enabled for this invoice' },
        { status: 400 }
      );
    }

    // Get the invoice owner's user ID to fetch PSP credentials
    const invoiceRecord = await prisma.invoice.findFirst({
      where: { paymentToken: token },
      select: { userId: true },
    });

    if (!invoiceRecord) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Get PSP credentials for the invoice owner
    const credentials = await getPSPCredentials(invoiceRecord.userId);

    if (!credentials) {
      return NextResponse.json(
        { error: 'Payment is not configured for this merchant' },
        { status: 400 }
      );
    }

    // Create payment gateway
    const gateway = getPaymentGateway(credentials);

    // Build success and cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const successUrl = `${baseUrl}/pay/${token}/success`;
    const cancelUrl = `${baseUrl}/pay/${token}`;

    // Create checkout session
    const session = await gateway.createCheckoutSession({
      invoiceId: invoice.id,
      amount: new Decimal(invoice.total),
      currency: invoice.currency as Currency,
      customerEmail: invoice.client.email,
      successUrl,
      cancelUrl,
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        paymentToken: token,
      },
    });

    // Store the checkout session ID for later verification
    await prisma.payment.upsert({
      where: { invoiceId: invoice.id },
      create: {
        invoiceId: invoice.id,
        type: 'fiat',
        amount: invoice.total,
        currency: invoice.currency as Currency,
        status: 'pending',
        metadata: { checkoutSessionId: session.id },
        fiatPayment: {
          create: {
            pspProvider: credentials.provider,
            checkoutSessionId: session.id,
          },
        },
      },
      update: {
        status: 'pending',
        metadata: { checkoutSessionId: session.id },
        fiatPayment: {
          upsert: {
            create: {
              pspProvider: credentials.provider,
              checkoutSessionId: session.id,
            },
            update: {
              checkoutSessionId: session.id,
            },
          },
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
