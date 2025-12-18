'use client';

interface LedgerEntry {
  id: string;
  entryDate: Date;
  amount: string;
  currency: string;
  amountInDefaultCurrency: string;
  paymentMethod: string;
  clientCountry: string | null;
  client?: { name: string; email: string } | null;
  project?: { name: string } | null;
  invoice?: { invoiceNumber: string } | null;
}

interface LedgerListProps {
  entries: LedgerEntry[];
  isLoading?: boolean;
}

const paymentMethodLabels: Record<string, string> = {
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  crypto_usdc: 'USDC',
  crypto_usdt: 'USDT',
};

const paymentMethodColors: Record<string, string> = {
  card: 'bg-blue-100 text-blue-800',
  bank_transfer: 'bg-purple-100 text-purple-800',
  crypto_usdc: 'bg-green-100 text-green-800',
  crypto_usdt: 'bg-emerald-100 text-emerald-800',
};

export function LedgerList({ entries, isLoading }: LedgerListProps) {
  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading ledger entries...</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No ledger entries found. Entries are created automatically when invoices are paid.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Invoice
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Client
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Project
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Amount
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Default Currency
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Payment Method
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {entries.map((entry) => (
            <tr key={entry.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {new Date(entry.entryDate).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm font-medium text-blue-600">
                  {entry.invoice?.invoiceNumber || '-'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{entry.client?.name || '-'}</div>
                <div className="text-sm text-gray-500">{entry.clientCountry || ''}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {entry.project?.name || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {entry.currency} {entry.amount}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-600">
                  USD {entry.amountInDefaultCurrency}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    paymentMethodColors[entry.paymentMethod] || 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {paymentMethodLabels[entry.paymentMethod] || entry.paymentMethod}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
