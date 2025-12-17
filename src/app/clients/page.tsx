'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClientForm } from '@/components/clients/client-form';
import { ClientList } from '@/components/clients/client-list';
import { Navbar } from '@/components/layout/navbar';
import { trpc } from '@/trpc/client';

// Temporary user ID for demo - will be replaced with auth
const DEMO_USER_ID = 'demo-user-id';

interface Client {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  country?: string | null;
  active: boolean;
}

export default function ClientsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // tRPC queries and mutations
  const clientsQuery = trpc.clients.list.useQuery({
    userId: DEMO_USER_ID,
    search: searchQuery || undefined,
    active: true,
  });

  const createMutation = trpc.clients.create.useMutation({
    onSuccess: () => {
      clientsQuery.refetch();
      setShowForm(false);
    },
  });

  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      clientsQuery.refetch();
      setEditingClient(null);
    },
  });

  const deleteMutation = trpc.clients.delete.useMutation({
    onSuccess: () => {
      clientsQuery.refetch();
    },
  });

  const handleCreate = async (data: {
    name: string;
    email: string;
    company?: string;
    country?: string;
    notes?: string;
  }) => {
    await createMutation.mutateAsync({
      userId: DEMO_USER_ID,
      ...data,
    });
  };

  const handleUpdate = async (data: {
    name: string;
    email: string;
    company?: string;
    country?: string;
    notes?: string;
  }) => {
    if (!editingClient) return;
    await updateMutation.mutateAsync({
      id: editingClient.id,
      userId: DEMO_USER_ID,
      ...data,
    });
  };

  const handleDelete = async (clientId: string) => {
    if (confirm('Are you sure you want to delete this client?')) {
      await deleteMutation.mutateAsync({
        id: clientId,
        userId: DEMO_USER_ID,
      });
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">客户管理</h1>
        <Button onClick={() => { setShowForm(true); setEditingClient(null); }}>
          Add Client
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Create Client</h2>
            <ClientForm
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
              isLoading={createMutation.isPending}
            />
          </div>
        </div>
      )}

      {/* Edit Form Modal */}
      {editingClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Edit Client</h2>
            <ClientForm
              initialData={{
                name: editingClient.name,
                email: editingClient.email,
                company: editingClient.company || undefined,
                country: editingClient.country || undefined,
              }}
              onSubmit={handleUpdate}
              onCancel={() => setEditingClient(null)}
              isLoading={updateMutation.isPending}
            />
          </div>
        </div>
      )}

        {/* Client List */}
        <div className="bg-white rounded-lg shadow">
          <ClientList
            clients={clientsQuery.data || []}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={clientsQuery.isLoading}
          />
        </div>
      </div>
    </div>
  );
}
