'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Decimal from 'decimal.js';

interface LineItemInput {
  description: string;
  quantity: string;
  unitPrice: string;
}

interface InvoiceFormData {
  clientId: string;
  projectId?: string;
  currency: 'USD' | 'EUR' | 'CNY' | 'GBP' | 'JPY';
  issueDate: string;
  dueDate: string;
  lineItems: LineItemInput[];
  taxRate: string;
  notes?: string;
  allowCardPayment: boolean;
  allowCryptoPayment: boolean;
}

interface Client {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

interface InvoiceFormProps {
  clients: Client[];
  projects: Project[];
  onSubmit: (data: InvoiceFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const emptyLineItem: LineItemInput = { description: '', quantity: '1', unitPrice: '0' };

export function InvoiceForm({ clients, projects, onSubmit, onCancel, isLoading }: InvoiceFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const defaultDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [formData, setFormData] = useState<InvoiceFormData>({
    clientId: '',
    projectId: '',
    currency: 'USD',
    issueDate: today,
    dueDate: defaultDueDate,
    lineItems: [{ ...emptyLineItem }],
    taxRate: '0',
    notes: '',
    allowCardPayment: true,
    allowCryptoPayment: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const calculateLineItemTotal = (item: LineItemInput): string => {
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
      return formData.lineItems
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
      const rate = new Decimal(formData.taxRate || 0).div(100);
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

  const addLineItem = () => {
    setFormData({
      ...formData,
      lineItems: [...formData.lineItems, { ...emptyLineItem }],
    });
  };

  const removeLineItem = (index: number) => {
    if (formData.lineItems.length > 1) {
      setFormData({
        ...formData,
        lineItems: formData.lineItems.filter((_, i) => i !== index),
      });
    }
  };

  const updateLineItem = (index: number, field: keyof LineItemInput, value: string) => {
    const newItems = [...formData.lineItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, lineItems: newItems });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.clientId) newErrors.clientId = 'Client is required';
    if (!formData.issueDate) newErrors.issueDate = 'Issue date is required';
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required';
    if (formData.lineItems.length === 0) newErrors.lineItems = 'At least one line item is required';

    formData.lineItems.forEach((item, index) => {
      if (!item.description.trim()) {
        newErrors[`lineItem_${index}_description`] = 'Description is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
          <select
            value={formData.clientId}
            onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Select a client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          {errors.clientId && <p className="mt-1 text-sm text-red-600">{errors.clientId}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
          <select
            value={formData.projectId}
            onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">No project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
          <select
            value={formData.currency}
            onChange={(e) =>
              setFormData({ ...formData, currency: e.target.value as InvoiceFormData['currency'] })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="CNY">CNY</option>
            <option value="GBP">GBP</option>
            <option value="JPY">JPY</option>
          </select>
        </div>

        <Input
          label="Issue Date *"
          type="date"
          value={formData.issueDate}
          onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
          error={errors.issueDate}
        />

        <Input
          label="Due Date *"
          type="date"
          value={formData.dueDate}
          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          error={errors.dueDate}
        />
      </div>

      {/* Line Items */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Line Items *</label>
        <div className="space-y-2">
          {formData.lineItems.map((item, index) => (
            <div key={index} className="flex gap-2 items-start">
              <div className="flex-1">
                <input
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="w-24">
                <input
                  placeholder="Qty"
                  type="number"
                  step="0.01"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="w-32">
                <input
                  placeholder="Unit Price"
                  type="number"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => updateLineItem(index, 'unitPrice', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="w-32 py-2 text-right font-medium">
                {formData.currency} {calculateLineItemTotal(item)}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeLineItem(index)}
                disabled={formData.lineItems.length === 1}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={addLineItem} className="mt-2">
          + Add Line Item
        </Button>
      </div>

      {/* Tax Rate */}
      <div className="w-48">
        <Input
          label="Tax Rate (%)"
          type="number"
          step="0.01"
          value={formData.taxRate}
          onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
        />
      </div>

      {/* Totals */}
      <div className="bg-gray-50 p-4 rounded-lg text-right">
        <div className="text-sm text-gray-600">
          Subtotal: {formData.currency} {calculateSubtotal()}
        </div>
        <div className="text-sm text-gray-600">
          Tax ({formData.taxRate}%): {formData.currency} {calculateTax()}
        </div>
        <div className="text-lg font-bold mt-2">
          Total: {formData.currency} {calculateTotal()}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          rows={3}
        />
      </div>

      {/* Payment Options */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.allowCardPayment}
            onChange={(e) => setFormData({ ...formData, allowCardPayment: e.target.checked })}
          />
          Allow Card Payment
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.allowCryptoPayment}
            onChange={(e) => setFormData({ ...formData, allowCryptoPayment: e.target.checked })}
          />
          Allow Crypto Payment
        </label>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Invoice'}
        </Button>
      </div>
    </form>
  );
}
