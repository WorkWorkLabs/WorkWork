/**
 * Crypto Payment Configuration API
 * Returns wallet addresses and supported chains/assets for crypto payments
 * _需求: 6.3_
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validatePaymentToken } from '@/server/payment/payment-link';
import type { Chain, StablecoinAsset } from '@/types/domain';

interface CryptoSettings {
  enabled: boolean;
  supportedChains: Chain[];
  supportedAssets: StablecoinAsset[];
}

/**
 * GET /api/pay/[token]/crypto-config
 * Returns crypto payment configuration for an invoice
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: 'Invalid payment token' },
        { status: 400 }
      );
    }

    // Validate the payment token
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

    // Check if crypto payment is allowed
    if (!invoice.allowCryptoPayment) {
      return NextResponse.json(
        { error: 'Crypto payment is not enabled for this invoice' },
        { status: 400 }
      );
    }

    // Get the invoice owner's user ID and crypto settings
    const invoiceRecord = await prisma.invoice.findFirst({
      where: { paymentToken: token },
      select: {
        userId: true,
        user: {
          select: {
            settings: {
              select: {
                cryptoSettings: true,
              },
            },
          },
        },
      },
    });

    if (!invoiceRecord) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Parse crypto settings
    const cryptoSettings = invoiceRecord.user.settings?.cryptoSettings as CryptoSettings | null;

    if (!cryptoSettings?.enabled) {
      return NextResponse.json(
        { error: 'Crypto payment is not configured for this merchant' },
        { status: 400 }
      );
    }

    const supportedChains = cryptoSettings.supportedChains || [];
    const supportedAssets = cryptoSettings.supportedAssets || [];

    if (supportedChains.length === 0 || supportedAssets.length === 0) {
      return NextResponse.json(
        { error: 'No crypto payment options configured' },
        { status: 400 }
      );
    }

    // Get wallet addresses for the user
    const walletAddresses = await prisma.walletAddress.findMany({
      where: {
        userId: invoiceRecord.userId,
        chain: { in: supportedChains },
        asset: { in: supportedAssets },
      },
      select: {
        address: true,
        chain: true,
        asset: true,
      },
    });

    return NextResponse.json({
      addresses: walletAddresses.map((addr) => ({
        address: addr.address,
        chain: addr.chain as Chain,
        asset: addr.asset as StablecoinAsset,
      })),
      supportedChains,
      supportedAssets,
    });
  } catch (error) {
    console.error('Crypto config error:', error);
    return NextResponse.json(
      { error: 'Failed to load crypto payment configuration' },
      { status: 500 }
    );
  }
}
