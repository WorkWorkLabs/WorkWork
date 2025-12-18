'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LedgerList } from '@/components/ledger/ledger-list';
import { LedgerFilters } from '@/components/ledger/ledger-filters';
import { Navbar } from '@/components/layout/navbar';
import { trpc } from '@/trpc/client';

const DEMO_USER_ID = 'demo-user-id';

type Currency = 'USD' | 'EUR' | 'HKD' | 'GBP' | 'JPY';
type PaymentMethod = 'card' | 'bank_transfer' | 'crypto_usdc' | 'crypto_usdt';

export default function LedgerPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currency, setCurrency] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const ledgerQuery = trpc.ledger.list.useQuery({
    userId: DEMO_USER_ID,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    currency: currency ? (currency as Currency) : undefined,
    paymentMethod: paymentMethod ? (paymentMethod as PaymentMethod) : undefined,
  });

  const exportQuery = trpc.ledger.exportCSV.useQuery(
    {
      userId: DEMO_USER_ID,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      currency: currency ? (currency as Currency) : undefined,
      paymentMethod: paymentMethod ? (paymentMethod as PaymentMethod) : undefined,
    },
    { enabled: false }
  );

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportQuery.refetch();
      if (result.data?.csv) {
        // Create and download CSV file
        const blob = new Blob([result.data.csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `ledger-export-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export ledger data');
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate totals
  const entries = ledgerQuery.data?.entries || [];
  const totalAmount = entries.reduce(
    (sum, entry) => sum + parseFloat(String(entry.amountInDefaultCurrency)),
    0
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">收入账本</h1>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Entries</p>
              <p className="text-2xl font-bold text-gray-900">
                {ledgerQuery.data?.total || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Income (USD)</p>
              <p className="text-2xl font-bold text-green-600">
                ${totalAmount.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Current Page</p>
              <p className="text-2xl font-bold text-gray-900">
                {ledgerQuery.data?.page || 1} / {ledgerQuery.data?.totalPages || 1}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <LedgerFilters
          startDate={startDate}
          endDate={endDate}
          currency={currency}
          paymentMethod={paymentMethod}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onCurrencyChange={setCurrency}
          onPaymentMethodChange={setPaymentMethod}
        />

        {/* Ledger List */}
        <div className="bg-white rounded-lg shadow">
          <LedgerList
            entries={entries.map((entry) => ({
              ...entry,
              amount: String(entry.amount),
              amountInDefaultCurrency: String(entry.amountInDefaultCurrency),
            }))}
            isLoading={ledgerQuery.isLoading}
          />
        </div>

        {/* Pagination */}
        {ledgerQuery.data && ledgerQuery.data.totalPages > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            <Button
              variant="secondary"
              disabled={ledgerQuery.data.page <= 1}
              onClick={() => {
                // TODO: Implement pagination
              }}
            >
              Previous
            </Button>
            <span className="px-4 py-2 text-gray-600">
              Page {ledgerQuery.data.page} of {ledgerQuery.data.totalPages}
            </span>
            <Button
              variant="secondary"
              disabled={ledgerQuery.data.page >= ledgerQuery.data.totalPages}
              onClick={() => {
                // TODO: Implement pagination
              }}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
