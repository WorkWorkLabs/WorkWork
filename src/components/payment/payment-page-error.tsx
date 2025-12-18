'use client';

interface PaymentPageErrorProps {
  error: 'not_found' | 'expired' | 'already_paid' | 'cancelled';
}

const errorMessages: Record<string, { title: string; description: string }> = {
  not_found: {
    title: 'Invoice Not Found',
    description: 'The payment link you followed is invalid or has expired. Please contact the sender for a new link.',
  },
  expired: {
    title: 'Link Expired',
    description: 'This payment link has expired. Please contact the sender for a new invoice.',
  },
  already_paid: {
    title: 'Already Paid',
    description: 'This invoice has already been paid. Thank you for your payment!',
  },
  cancelled: {
    title: 'Invoice Cancelled',
    description: 'This invoice has been cancelled by the sender. Please contact them for more information.',
  },
};

/**
 * Error state for payment page
 * _需求: 6.6_
 */
export function PaymentPageError({ error }: PaymentPageErrorProps) {
  const { title, description } = errorMessages[error] || errorMessages.not_found;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {error === 'already_paid' ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            )}
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  );
}
