'use client';

import { useRouter } from 'next/navigation';
import { InvoiceForm } from '@/components/invoices/invoice-form';
import { Navbar } from '@/components/layout/navbar';
import { trpc } from '@/trpc/client';

const DEMO_USER_ID = 'demo-user-id';

export default function NewInvoicePage() {
  const router = useRouter();

  const clientsQuery = trpc.client.list.useQuery({
    userId: DEMO_USER_ID,
    active: true,
  });

  const projectsQuery = trpc.project.list.useQuery({
    userId: DEMO_USER_ID,
    includeArchived: false,
  });

  const createMutation = trpc.invoice.create.useMutation({
    onSuccess: () => {
      router.push('/invoices');
    },
  });

  const handleSubmit = async (data: {
    clientId: string;
    projectId?: string;
    currency: 'USD' | 'EUR' | 'CNY' | 'GBP' | 'JPY';
    issueDate: string;
    dueDate: string;
    lineItems: { description: string; quantity: string; unitPrice: string }[];
    taxRate: string;
    notes?: string;
    allowCardPayment: boolean;
    allowCryptoPayment: boolean;
  }) => {
    await createMutation.mutateAsync({
      userId: DEMO_USER_ID,
      clientId: data.clientId,
      projectId: data.projectId || undefined,
      currency: data.currency,
      issueDate: new Date(data.issueDate),
      dueDate: new Date(data.dueDate),
      lineItems: data.lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      taxRate: data.taxRate,
      notes: data.notes,
      allowCardPayment: data.allowCardPayment,
      allowCryptoPayment: data.allowCryptoPayment,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">创建发票</h1>

        <div className="bg-white rounded-lg shadow p-6">
          <InvoiceForm
            clients={(clientsQuery.data || []).map((c) => ({ id: c.id, name: c.name }))}
            projects={(projectsQuery.data || []).map((p) => ({ id: p.id, name: p.name }))}
            onSubmit={handleSubmit}
            onCancel={() => router.push('/invoices')}
            isLoading={createMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}
