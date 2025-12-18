'use client';

import { useState } from 'react';
import Decimal from 'decimal.js';
import { Button } from '@/components/ui/button';
import type { PaymentPageInvoice } from '@/server/payment/payment-link';

interface PaymentPageContentProps {
  invoice: PaymentPageInvoice;
  token: string;
}

type PaymentMethod = 'card' | 'crypto';

const currencySymbols: Record<string, string> = {
  USD: '$',
  EUR: '€',
  HKD: 'HK$',
  GBP: '£',
  JPY: '¥',
};

/**
 * Payment page content component
 * Displays invoice details and payment options
 * _需求: 6.1, 6.2, 6.3_
 */
export function PaymentPageContent({ invoice, token }: PaymentPageContentProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const symbol = currencySymbols[invoice.currency] || invoice.currency;
  const businessName = invoice.user.settings?.businessName || invoice.user.name || 'Business';

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handlePayWithCard = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/pay/${token}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'card' }),
      });

      const data = await response.json();

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to create checkout session');
        setIsProcessing(false);
      }
    } catch {
      alert('Failed to process payment. Please try again.');
      setIsProcessing(false);
    }
  };

  const isOverdue = invoice.status === 'overdue';
  const taxRatePercent = new Decimal(invoice.taxRate).mul(100).toFixed(2);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{businessName}</h1>
          <p className="text-gray-600 mt-1">Invoice #{invoice.invoiceNumber}</p>
        </div>

        {/* Invoice Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Status Banner */}
          {isOverdue && (
            <div className="bg-red-50 border-b border-red-100 px-6 py-3">
              <p className="text-red-700 text-sm font-medium">
                ⚠️ This invoice is overdue. Please pay as soon as possible.
              </p>
            </div>
          )}

          {/* Invoice Details */}
          <div className="p-6">
            {/* Dates */}
            <div className="flex justify-between text-sm text-gray-600 mb-6">
              <div>
                <span className="text-gray-500">Issue Date:</span>{' '}
                <span className="font-medium">{formatDate(invoice.issueDate)}</span>
              </div>
              <div>
                <span className="text-gray-500">Due Date:</span>{' '}
                <span className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                  {formatDate(invoice.dueDate)}
                </span>
              </div>
            </div>

            {/* Bill To */}
            <div className="mb-6">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Bill To</p>
              <p className="font-medium text-gray-900">{invoice.client.name}</p>
              <p className="text-gray-600 text-sm">{invoice.client.email}</p>
              {invoice.client.company && (
                <p className="text-gray-600 text-sm">{invoice.client.company}</p>
              )}
            </div>

            {/* Line Items */}
            <div className="border rounded-lg overflow-hidden mb-6">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs text-gray-500 uppercase tracking-wider font-medium">
                      Description
                    </th>
                    <th className="text-center py-3 px-4 text-xs text-gray-500 uppercase tracking-wider font-medium w-20">
                      Qty
                    </th>
                    <th className="text-right py-3 px-4 text-xs text-gray-500 uppercase tracking-wider font-medium w-28">
                      Price
                    </th>
                    <th className="text-right py-3 px-4 text-xs text-gray-500 uppercase tracking-wider font-medium w-28">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoice.lineItems.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 px-4 text-gray-900">{item.description}</td>
                      <td className="py-3 px-4 text-center text-gray-600">{item.quantity}</td>
                      <td className="py-3 px-4 text-right text-gray-600">
                        {symbol}{new Decimal(item.unitPrice).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-900 font-medium">
                        {symbol}{new Decimal(item.total).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64">
                <div className="flex justify-between py-2 text-gray-600">
                  <span>Subtotal</span>
                  <span>{symbol}{new Decimal(invoice.subtotal).toFixed(2)}</span>
                </div>
                {parseFloat(invoice.taxRate) > 0 && (
                  <div className="flex justify-between py-2 text-gray-600">
                    <span>Tax ({taxRatePercent}%)</span>
                    <span>{symbol}{new Decimal(invoice.taxAmount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between py-3 border-t border-gray-200 font-bold text-gray-900 text-lg">
                  <span>Total</span>
                  <span>{symbol}{new Decimal(invoice.total).toFixed(2)} {invoice.currency}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Notes</p>
                <p className="text-gray-600 text-sm">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Payment Section */}
          <div className="bg-gray-50 p-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h2>

            <div className="space-y-3">
              {/* Card Payment Option */}
              {invoice.allowCardPayment && (
                <button
                  onClick={() => setSelectedMethod('card')}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                    selectedMethod === 'card'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="font-medium text-gray-900">Credit / Debit Card</p>
                      <p className="text-sm text-gray-500">Pay securely with Stripe</p>
                    </div>
                  </div>
                </button>
              )}

              {/* Crypto Payment Option */}
              {invoice.allowCryptoPayment && (
                <button
                  onClick={() => setSelectedMethod('crypto')}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                    selectedMethod === 'crypto'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="font-medium text-gray-900">Stablecoin (USDC/USDT)</p>
                      <p className="text-sm text-gray-500">Pay with crypto on Arbitrum, Base, or Polygon</p>
                    </div>
                  </div>
                </button>
              )}
            </div>

            {/* Pay Button */}
            {selectedMethod && (
              <div className="mt-6">
                {selectedMethod === 'card' && (
                  <Button
                    onClick={handlePayWithCard}
                    disabled={isProcessing}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3"
                    size="lg"
                  >
                    {isProcessing ? 'Processing...' : `Pay ${symbol}${new Decimal(invoice.total).toFixed(2)} ${invoice.currency}`}
                  </Button>
                )}
                {selectedMethod === 'crypto' && (
                  <div className="text-center text-gray-600 py-4">
                    <p>Crypto payment coming soon...</p>
                  </div>
                )}
              </div>
            )}

            {/* No payment methods available */}
            {!invoice.allowCardPayment && !invoice.allowCryptoPayment && (
              <p className="text-gray-600 text-center py-4">
                No payment methods are currently available for this invoice.
                Please contact the sender.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Powered by WorkWork Ledger</p>
        </div>
      </div>
    </div>
  );
}
