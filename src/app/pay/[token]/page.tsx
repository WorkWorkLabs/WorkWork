'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PaymentPageContent } from '@/components/payment/payment-page-content';
import { PaymentPageError } from '@/components/payment/payment-page-error';
import { PaymentPageLoading } from '@/components/payment/payment-page-loading';
import type { PaymentPageInvoice } from '@/server/payment/payment-link';

type PageState =
  | { status: 'loading' }
  | { status: 'error'; error: 'not_found' | 'expired' | 'already_paid' | 'cancelled' }
  | { status: 'success'; invoice: PaymentPageInvoice };

/**
 * Public Payment Page
 * Allows customers to view and pay invoices without authentication
 * _需求: 6.1, 6.6_
 */
export default function PaymentPage() {
  const params = useParams();
  const token = params.token as string;
  const [state, setState] = useState<PageState>({ status: 'loading' });

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setState({ status: 'error', error: 'not_found' });
        return;
      }

      try {
        const response = await fetch(`/api/pay/${token}/validate`);
        const data = await response.json();

        if (data.valid) {
          setState({ status: 'success', invoice: data.invoice });
        } else {
          setState({ status: 'error', error: data.error || 'not_found' });
        }
      } catch {
        setState({ status: 'error', error: 'not_found' });
      }
    }

    validateToken();
  }, [token]);

  if (state.status === 'loading') {
    return <PaymentPageLoading />;
  }

  if (state.status === 'error') {
    return <PaymentPageError error={state.error} />;
  }

  return <PaymentPageContent invoice={state.invoice} token={token} />;
}
