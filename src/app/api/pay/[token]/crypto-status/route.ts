/**
 * Crypto Payment Status API
 * Returns the current status of a crypto payment for an invoice
 * _需求: 6.5, 7.4_
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validatePaymentToken } from '@/server/payment/payment-link';
import { getVerificationService } from '@/server/payment/crypto-verification.service';
import type { Chain } from '@/types/domain';

/**
 * GET /api/pay/[token]/crypto-status
 * Returns the current status of a crypto payment
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

    // If invoice is already paid, return success status
    if (!result.valid && result.error === 'already_paid') {
      return NextResponse.json({
        status: 'paid',
        message: 'Invoice has been paid',
      });
    }

    if (!result.valid) {
      const errorMessages: Record<string, string> = {
        not_found: 'Invoice not found',
        expired: 'Payment link has expired',
        cancelled: 'Invoice has been cancelled',
      };
      return NextResponse.json(
        { error: errorMessages[result.error] || 'Invalid payment link' },
        { status: 400 }
      );
    }

    const { invoice } = result;

    // Get the payment record with crypto details
    const payment = await prisma.payment.findFirst({
      where: {
        invoice: {
          paymentToken: token,
        },
        type: 'crypto',
      },
      include: {
        cryptoPayment: true,
      },
    });

    // No crypto payment initiated yet
    if (!payment || !payment.cryptoPayment) {
      return NextResponse.json({
        status: 'waiting',
        message: 'Waiting for payment',
      });
    }

    const cryptoPayment = payment.cryptoPayment;

    // If payment is already succeeded
    if (payment.status === 'succeeded') {
      return NextResponse.json({
        status: 'paid',
        message: 'Payment confirmed',
        details: {
          chain: cryptoPayment.chain,
          asset: cryptoPayment.asset,
          txHash: cryptoPayment.txHash,
          confirmations: cryptoPayment.confirmations,
        },
      });
    }

    // If we have a transaction hash, check its status
    if (cryptoPayment.txHash) {
      try {
        const verificationService = getVerificationService();
        const confirmationStatus = await verificationService.getConfirmationStatus(
          cryptoPayment.txHash,
          cryptoPayment.chain as Chain
        );

        // Update confirmations in database
        await prisma.cryptoPayment.update({
          where: { id: cryptoPayment.id },
          data: { confirmations: confirmationStatus.confirmations },
        });

        if (confirmationStatus.isConfirmed) {
          return NextResponse.json({
            status: 'confirmed',
            message: 'Payment confirmed',
            details: {
              chain: cryptoPayment.chain,
              asset: cryptoPayment.asset,
              txHash: cryptoPayment.txHash,
              confirmations: confirmationStatus.confirmations,
              required: confirmationStatus.required,
            },
          });
        }

        return NextResponse.json({
          status: 'confirming',
          message: `Waiting for confirmations (${confirmationStatus.confirmations}/${confirmationStatus.required})`,
          details: {
            chain: cryptoPayment.chain,
            asset: cryptoPayment.asset,
            txHash: cryptoPayment.txHash,
            confirmations: confirmationStatus.confirmations,
            required: confirmationStatus.required,
          },
        });
      } catch (error) {
        console.error('Error checking transaction status:', error);
        // Return pending status if we can't verify
        return NextResponse.json({
          status: 'pending',
          message: 'Verifying transaction...',
          details: {
            chain: cryptoPayment.chain,
            asset: cryptoPayment.asset,
            txHash: cryptoPayment.txHash,
          },
        });
      }
    }

    // Payment record exists but no transaction yet
    return NextResponse.json({
      status: 'waiting',
      message: 'Waiting for payment',
    });
  } catch (error) {
    console.error('Crypto status error:', error);
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
}
