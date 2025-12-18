'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';

/**
 * Payment Success Page
 * Displayed after successful payment completion
 * _需求: 6.4_
 */
export default function PaymentSuccessPage() {
  const params = useParams();
  const token = params.token as string;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">
          Thank you for your payment. A confirmation email will be sent to you shortly.
        </p>
        <Link
          href={`/pay/${token}`}
          className="inline-block px-6 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
        >
          View Invoice
        </Link>
      </div>
    </div>
  );
}
