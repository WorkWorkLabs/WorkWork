'use client';

import { Input } from '@/components/ui/input';

interface LedgerFiltersProps {
  startDate: string;
  endDate: string;
  currency: string;
  paymentMethod: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onPaymentMethodChange: (value: string) => void;
}

export function LedgerFilters({
  startDate,
  endDate,
  currency,
  paymentMethod,
  onStartDateChange,
  onEndDateChange,
  onCurrencyChange,
  onPaymentMethodChange,
}: LedgerFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <div className="flex flex-col">
        <label className="text-sm text-gray-600 mb-1">Start Date</label>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="w-40"
        />
      </div>
      <div className="flex flex-col">
        <label className="text-sm text-gray-600 mb-1">End Date</label>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="w-40"
        />
      </div>
      <div className="flex flex-col">
        <label className="text-sm text-gray-600 mb-1">Currency</label>
        <select
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Currencies</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="HKD">HKD</option>
          <option value="GBP">GBP</option>
          <option value="JPY">JPY</option>
        </select>
      </div>
      <div className="flex flex-col">
        <label className="text-sm text-gray-600 mb-1">Payment Method</label>
        <select
          value={paymentMethod}
          onChange={(e) => onPaymentMethodChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Methods</option>
          <option value="card">Card</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="crypto_usdc">USDC</option>
          <option value="crypto_usdt">USDT</option>
        </select>
      </div>
    </div>
  );
}
