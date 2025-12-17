'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { InvoicePreview } from '@/components/invoices/invoice-preview';
import { trpc } from '@/trpc/client';
import Decimal from 'decimal.js';

const DEMO_USER_ID = 'demo-user-id';

interface LineItemInput {
  description: string;
  quantity: string;
  unitPrice: string;
}

type Currency = 'USD' | 'EUR' | 'CNY' | 'GBP' | 'JPY';

export default function NewInvoicePage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const today = new Date().toISOString().split('T')[0];
  const defaultDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Client selection mode: 'existing' or 'new'
  const [clientMode, setClientMode] = useState<'existing' | 'new'>('new');

  // Form state
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [fromAddress, setFromAddress] = useState('');
  const [fromPhone, setFromPhone] = useState('');
  
  // Client info (for new client)
  const [toEmail, setToEmail] = useState('');
  const [toName, setToName] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [toCompany, setToCompany] = useState('');
  const [toCountry, setToCountry] = useState('');
  
  // Existing client selection
  const [clientId, setClientId] = useState('');
  
  const [projectId, setProjectId] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [lineItems, setLineItems] = useState<LineItemInput[]>([
    { description: 'Service', quantity: '1', unitPrice: '0' },
  ]);
  const [taxRate, setTaxRate] = useState('0');
  const [notes, setNotes] = useState('Thank you for your business! Payment is due within 30 days.');
  const [allowCardPayment, setAllowCardPayment] = useState(true);
  const [allowCryptoPayment, setAllowCryptoPayment] = useState(false);

  // Queries
  const clientsQuery = trpc.clients.list.useQuery({
    userId: DEMO_USER_ID,
    active: true,
  });

  const projectsQuery = trpc.project.list.useQuery({
    userId: DEMO_USER_ID,
    includeArchived: false,
  });

  const createMutation = trpc.invoice.create.useMutation({
    onSuccess: () => {
      // Invalidate clients query to refresh the list with new client
      utils.clients.list.invalidate();
      router.push('/invoices');
    },
  });

  // Handlers
  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: '1', unitPrice: '0' }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: keyof LineItemInput, value: string) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setLineItems(newItems);
  };

  const handleClientSelect = (id: string) => {
    setClientId(id);
    const client = clientsQuery.data?.find((c) => c.id === id);
    if (client) {
      setToName(client.name);
      setToEmail(client.email);
      setToCompany(client.company || '');
      setToCountry(client.country || '');
      setClientMode('existing');
    }
  };

  const switchToNewClient = () => {
    setClientMode('new');
    setClientId('');
    // Keep the entered info
  };

  const calculateTotal = (): string => {
    try {
      const subtotal = lineItems.reduce((sum, item) => {
        const qty = new Decimal(item.quantity || 0);
        const price = new Decimal(item.unitPrice || 0);
        return sum.add(qty.mul(price));
      }, new Decimal(0));
      const tax = subtotal.mul(new Decimal(taxRate || 0).div(100));
      return subtotal.add(tax).toFixed(2);
    } catch {
      return '0.00';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (clientMode === 'existing' && !clientId) {
      alert('请选择客户');
      return;
    }
    if (clientMode === 'new' && (!toEmail || !toName)) {
      alert('请填写客户邮箱和姓名');
      return;
    }

    const baseInput = {
      userId: DEMO_USER_ID,
      projectId: projectId || undefined,
      currency,
      issueDate: new Date(today),
      dueDate: new Date(dueDate),
      lineItems: lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      taxRate,
      notes,
      allowCardPayment,
      allowCryptoPayment,
    };

    if (clientMode === 'existing') {
      await createMutation.mutateAsync({
        ...baseInput,
        clientId,
      });
    } else {
      // Create invoice with new client
      await createMutation.mutateAsync({
        ...baseInput,
        newClient: {
          name: toName,
          email: toEmail,
          company: toCompany || undefined,
          country: toCountry || undefined,
          address: toAddress || undefined,
        },
      });
    }
  };

  // Preview data
  const previewData = {
    invoiceNumber: 'INV-' + new Date().getTime().toString().slice(-6),
    issueDate: today,
    dueDate,
    fromName,
    fromEmail,
    fromAddress,
    fromPhone,
    toName,
    toEmail,
    toAddress,
    lineItems,
    currency,
    taxRate,
    notes,
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/invoices"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </Link>
          <button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {createMutation.isPending ? '创建中...' : '创建发票'}
          </button>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Invoice Preview */}
          <div className="order-2 lg:order-1">
            <div className="sticky top-8">
              <InvoicePreview data={previewData} />
            </div>
          </div>

          {/* Right: Form */}
          <div className="order-1 lg:order-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">创建发票</h1>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    到期日期 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                {/* From (You) Section */}
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900">发送方 (您)</h2>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      邮箱 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={fromEmail}
                      onChange={(e) => setFromEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      placeholder="您的姓名 / 公司名称"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">地址</label>
                    <input
                      type="text"
                      value={fromAddress}
                      onChange={(e) => setFromAddress(e.target.value)}
                      placeholder="您的地址"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">电话</label>
                    <input
                      type="text"
                      value={fromPhone}
                      onChange={(e) => setFromPhone(e.target.value)}
                      placeholder="您的电话"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* To (Client) Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">收款方 (客户)</h2>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setClientMode('new')}
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                          clientMode === 'new'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        新客户
                      </button>
                      <button
                        type="button"
                        onClick={() => setClientMode('existing')}
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                          clientMode === 'existing'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        已有客户
                      </button>
                    </div>
                  </div>

                  {clientMode === 'existing' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          选择客户 <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={clientId}
                          onChange={(e) => handleClientSelect(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        >
                          <option value="">选择客户...</option>
                          {clientsQuery.data?.map((client) => (
                            <option key={client.id} value={client.id}>
                              {client.name} ({client.email})
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* Recent Contacts */}
                      {clientsQuery.data && clientsQuery.data.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 mb-2">最近联系人</p>
                          <div className="space-y-1">
                            {clientsQuery.data.slice(0, 3).map((client) => (
                              <button
                                key={client.id}
                                type="button"
                                onClick={() => handleClientSelect(client.id)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                  clientId === client.id
                                    ? 'bg-emerald-50 border border-emerald-200'
                                    : 'bg-gray-50 hover:bg-gray-100'
                                }`}
                              >
                                <div className="font-medium text-gray-900">{client.name}</div>
                                <div className="text-gray-500 text-xs">{client.email}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {clientsQuery.data?.length === 0 && (
                        <div className="text-center py-4 text-gray-500">
                          <p>暂无客户记录</p>
                          <button
                            type="button"
                            onClick={switchToNewClient}
                            className="text-emerald-600 hover:text-emerald-700 mt-2"
                          >
                            添加新客户
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="p-3 bg-emerald-50 rounded-lg text-sm text-emerald-700">
                        💡 新客户信息将在发票创建时自动保存到客户列表
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          邮箱 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={toEmail}
                          onChange={(e) => setToEmail(e.target.value)}
                          placeholder="client@email.com"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          姓名 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={toName}
                          onChange={(e) => setToName(e.target.value)}
                          placeholder="客户姓名"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">公司</label>
                        <input
                          type="text"
                          value={toCompany}
                          onChange={(e) => setToCompany(e.target.value)}
                          placeholder="客户公司名称"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">国家/地区</label>
                        <input
                          type="text"
                          value={toCountry}
                          onChange={(e) => setToCountry(e.target.value)}
                          placeholder="客户所在国家/地区"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">地址</label>
                        <input
                          type="text"
                          value={toAddress}
                          onChange={(e) => setToAddress(e.target.value)}
                          placeholder="客户地址"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Project & Currency */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">项目</label>
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">无项目</option>
                      {projectsQuery.data?.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">币种</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as Currency)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="USD">USD - 美元</option>
                      <option value="EUR">EUR - 欧元</option>
                      <option value="CNY">CNY - 人民币</option>
                      <option value="GBP">GBP - 英镑</option>
                      <option value="JPY">JPY - 日元</option>
                    </select>
                  </div>
                </div>

                {/* Line Items */}
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900">服务项目</h2>
                  
                  {lineItems.map((item, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">项目 {index + 1}</span>
                        {lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLineItem(index)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            删除
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        placeholder="服务描述"
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">数量</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">单价</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateLineItem(index, 'unitPrice', e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addLineItem}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                  >
                    + 添加项目
                  </button>
                </div>

                {/* Tax Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">税率 (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                {/* Payment Options */}
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-gray-900">支付方式</h2>
                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={allowCardPayment}
                      onChange={(e) => setAllowCardPayment(e.target.checked)}
                      className="w-5 h-5 text-emerald-600 rounded"
                    />
                    <span className="text-gray-700">允许银行卡支付 (Stripe)</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={allowCryptoPayment}
                      onChange={(e) => setAllowCryptoPayment(e.target.checked)}
                      className="w-5 h-5 text-emerald-600 rounded"
                    />
                    <span className="text-gray-700">允许加密货币支付 (USDC/USDT)</span>
                  </label>
                </div>

                {/* Total Summary */}
                <div className="p-4 bg-emerald-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">总计</span>
                    <span className="text-2xl font-bold text-emerald-600">
                      {currency} {calculateTotal()}
                    </span>
                  </div>
                </div>

                {/* Submit Button (Mobile) */}
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full lg:hidden py-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium"
                >
                  {createMutation.isPending ? '创建中...' : '创建发票'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
