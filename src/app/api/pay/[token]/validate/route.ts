import { NextRequest, NextResponse } from 'next/server';
import { validatePaymentToken } from '@/server/payment/payment-link';

/**
 * GET /api/pay/[token]/validate
 * Validates a payment token and returns invoice data
 * _需求: 6.1, 6.6_
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'not_found' },
        { status: 404 }
      );
    }

    const result = await validatePaymentToken(token);

    if (!result.valid) {
      const statusCode = result.error === 'not_found' ? 404 : 400;
      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Payment token validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'not_found' },
      { status: 500 }
    );
  }
}
