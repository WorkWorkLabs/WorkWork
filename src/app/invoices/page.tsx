'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { InvoiceList } from '@/components/invoices/invoice-list';
import { Navbar } from '@/components/layout/navbar';
import { trpc } from '@/trpc/client';

const DEMO_USER_ID = 'demo-user-id';

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export default function InvoicesPage() {
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');

  const invoicesQuery = trpc.invoice.list.useQuery({
    userId: DEMO_USER_ID,
    status: statusFilter || undefined,
  });

  const sendMutation = trpc.invoice.send.useMutation({
    onSuccess: () => invoicesQuery.refetch(),
  });

  const markPaidMutation = trpc.invoice.markAsPaid.useMutation({
    onSuccess: () => invoicesQuery.refetch(),
  });

  const cancelMutation = trpc.invoice.cancel.useMutation({
    onSuccess: () => invoicesQuery.refetch(),
  });

  const handleSend = async (invoiceId: string) => {
    if (confirm('Send this invoice to the client?')) {
      await sendMutation.mutateAsync({ id: invoiceId, userId: DEMO_USER_ID });
    }
  };

  const handleMarkPaid = async (invoiceId: string) => {
    if (confirm('Mark this invoice as paid?')) {
      await markPaidMutation.mutateAsync({ id: invoiceId, userId: DEMO_USER_ID });
    }
  };

  const handleCancel = async (invoiceId: string) => {
    if (confirm('Cancel this invoice? This action cannot be undone.')) {
      await cancelMutation.mutateAsync({ id: invoiceId, userId: DEMO_USER_ID });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">发票管理</h1>
          <Link href="/invoices/new">
            <Button>创建发票</Button>
          </Link>
        </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | '')}
          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

        {/* Invoice List */}
        <div className="bg-white rounded-lg shadow">
          <InvoiceList
            invoices={(invoicesQuery.data || []).map((inv) => ({
              ...inv,
              total: String(inv.total),
            }))}
            onView={(invoice) => {
              window.location.href = `/invoices/${invoice.id}`;
            }}
            onSend={handleSend}
            onMarkPaid={handleMarkPaid}
            onCancel={handleCancel}
            isLoading={invoicesQuery.isLoading}
          />
        </div>
      </div>
    </div>
  );
}
