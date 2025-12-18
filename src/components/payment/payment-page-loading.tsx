'use client';

/**
 * Loading state for payment page
 */
export function PaymentPageLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading invoice...</p>
      </div>
    </div>
  );
}
