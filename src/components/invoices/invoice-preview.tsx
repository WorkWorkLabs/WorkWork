'use client';

import Decimal from 'decimal.js';

interface LineItem {
  description: string;
  quantity: string;
  unitPrice: string;
}

interface InvoicePreviewData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  // From (sender)
  fromName: string;
  fromEmail: string;
  fromAddress?: string;
  fromPhone?: string;
  // To (client)
  toName: string;
  toEmail: string;
  toAddress?: string;
  // Items
  lineItems: LineItem[];
  currency: string;
  taxRate: string;
  notes?: string;
}

interface InvoicePreviewProps {
  data: InvoicePreviewData;
}

const currencySymbols: Record<string, string> = {
  USD: '$',
  EUR: '€',
  CNY: '¥',
  GBP: '£',
  JPY: '¥',
};

export function InvoicePreview({ data }: InvoicePreviewProps) {
  const symbol = currencySymbols[data.currency] || data.currency;

  const calculateLineItemTotal = (item: LineItem): string => {
    try {
      const qty = new Decimal(item.quantity || 0);
      const price = new Decimal(item.unitPrice || 0);
      return qty.mul(price).toFixed(2);
    } catch {
      return '0.00';
    }
  };

  const calculateSubtotal = (): string => {
    try {
      return data.lineItems
        .reduce((sum, item) => {
          const total = new Decimal(calculateLineItemTotal(item));
          return sum.add(total);
        }, new Decimal(0))
        .toFixed(2);
    } catch {
      return '0.00';
    }
  };

  const calculateTax = (): string => {
    try {
      const subtotal = new Decimal(calculateSubtotal());
      const rate = new Decimal(data.taxRate || 0).div(100);
      return subtotal.mul(rate).toFixed(2);
    } catch {
      return '0.00';
    }
  };

  const calculateTotal = (): string => {
    try {
      const subtotal = new Decimal(calculateSubtotal());
      const tax = new Decimal(calculateTax());
      return subtotal.add(tax).toFixed(2);
    } catch {
      return '0.00';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 min-h-[800px] text-sm">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">INVOICE</h1>
          <p className="text-gray-500 mt-1">#{data.invoiceNumber || 'INV-XXXX'}</p>
          <p className="text-emerald-600 mt-2">{formatDate(data.issueDate)}</p>
        </div>
        <div className="text-right">
          {/* Logo placeholder */}
          <div className="text-2xl font-bold text-emerald-600">
            {data.fromName || 'Your Business'}
          </div>
        </div>
      </div>

      {/* From / To */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">From:</p>
          <p className="font-medium text-gray-900">{data.fromEmail || 'your@email.com'}</p>
          <p className="text-gray-600">{data.fromName || 'Your Name'}</p>
          {data.fromAddress && <p className="text-gray-600">{data.fromAddress}</p>}
          {data.fromPhone && <p className="text-gray-600">{data.fromPhone}</p>}
        </div>
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">To:</p>
          <p className="font-medium text-gray-900">{data.toEmail || 'client@email.com'}</p>
          <p className="text-gray-600">{data.toName || 'Client Name'}</p>
          {data.toAddress && <p className="text-gray-600">{data.toAddress}</p>}
        </div>
      </div>

      {/* Due Date */}
      <div className="mb-8">
        <p className="text-gray-500 text-xs uppercase tracking-wider">Due Date:</p>
        <p className="text-emerald-600 font-medium">{formatDate(data.dueDate)}</p>
      </div>

      {/* Line Items Table */}
      <div className="mb-8">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 text-gray-500 text-xs uppercase tracking-wider font-medium">
                Item
              </th>
              <th className="text-center py-3 text-gray-500 text-xs uppercase tracking-wider font-medium w-20">
                Quantity
              </th>
              <th className="text-right py-3 text-gray-500 text-xs uppercase tracking-wider font-medium w-28">
                Amount
              </th>
              <th className="text-right py-3 text-gray-500 text-xs uppercase tracking-wider font-medium w-28">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {data.lineItems.map((item, index) => (
              <tr key={index} className="border-b border-gray-100">
                <td className="py-3 text-gray-900">
                  {item.description || 'Service'}
                </td>
                <td className="py-3 text-center text-gray-600">
                  {item.quantity || '1'}
                </td>
                <td className="py-3 text-right text-gray-600">
                  {symbol}{new Decimal(item.unitPrice || 0).toFixed(2)} {data.currency}
                </td>
                <td className="py-3 text-right text-gray-900 font-medium">
                  {symbol}{calculateLineItemTotal(item)} {data.currency}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-64">
          <div className="flex justify-between py-2 text-gray-600">
            <span>Subtotal:</span>
            <span>{symbol}{calculateSubtotal()} {data.currency}</span>
          </div>
          {parseFloat(data.taxRate) > 0 && (
            <div className="flex justify-between py-2 text-gray-600">
              <span>Tax ({data.taxRate}%):</span>
              <span>{symbol}{calculateTax()} {data.currency}</span>
            </div>
          )}
          <div className="flex justify-between py-3 border-t border-gray-200 font-bold text-gray-900 text-lg">
            <span>Total:</span>
            <span>{symbol}{calculateTotal()} {data.currency}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {data.notes && (
        <div className="border-t border-gray-200 pt-6">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Note:</p>
          <p className="text-gray-600">{data.notes}</p>
        </div>
      )}

      {/* Default note if no custom note */}
      {!data.notes && (
        <div className="border-t border-gray-200 pt-6">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Note:</p>
          <p className="text-gray-600">Thank you for your business! Payment is due within 30 days.</p>
        </div>
      )}
    </div>
  );
}
