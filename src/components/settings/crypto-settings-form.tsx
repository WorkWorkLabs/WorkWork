'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/trpc/client';
import type { Chain, StablecoinAsset } from '@/types/domain';

interface CryptoSettingsFormProps {
  userId: string;
}



/**
 * Chain display names
 */
const CHAIN_LABELS: Record<Chain, string> = {
  arbitrum: 'Arbitrum',
  base: 'Base',
  polygon: 'Polygon',
};

/**
 * Asset display names
 */
const ASSET_LABELS: Record<StablecoinAsset, string> = {
  USDC: 'USDC',
  USDT: 'USDT',
};

/**
 * Crypto Settings Form Component
 * Implements requirements 2.3, 2.4
 */
export function CryptoSettingsForm({ userId }: CryptoSettingsFormProps) {
  const [enabled, setEnabled] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<StablecoinAsset[]>([]);
  const [selectedChains, setSelectedChains] = useState<Chain[]>([]);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch current settings
  const settingsQuery = trpc.crypto.getSettings.useQuery({ userId });
  const addressesQuery = trpc.crypto.getAddresses.useQuery({ userId });
  const optionsQuery = trpc.crypto.getOptions.useQuery();

  // Save mutation
  const saveMutation = trpc.crypto.saveSettings.useMutation({
    onSuccess: () => {
      setSaveMessage({ type: 'success', text: '设置已保存，收款地址已生成' });
      addressesQuery.refetch();
      setTimeout(() => setSaveMessage(null), 3000);
    },
    onError: (error) => {
      setSaveMessage({ type: 'error', text: `保存失败: ${error.message}` });
      setTimeout(() => setSaveMessage(null), 5000);
    },
  });

  // Initialize form with current settings
  useEffect(() => {
    if (settingsQuery.data) {
      setEnabled(settingsQuery.data.enabled);
      setSelectedAssets(settingsQuery.data.enabledAssets);
      setSelectedChains(settingsQuery.data.enabledChains);
    }
  }, [settingsQuery.data]);

  const handleAssetToggle = (asset: StablecoinAsset) => {
    setSelectedAssets(prev =>
      prev.includes(asset)
        ? prev.filter(a => a !== asset)
        : [...prev, asset]
    );
  };

  const handleChainToggle = (chain: Chain) => {
    setSelectedChains(prev =>
      prev.includes(chain)
        ? prev.filter(c => c !== chain)
        : [...prev, chain]
    );
  };

  const handleSave = async () => {
    await saveMutation.mutateAsync({
      userId,
      settings: {
        enabled,
        enabledAssets: selectedAssets,
        enabledChains: selectedChains,
      },
    });
  };

  const canSave = enabled ? selectedAssets.length > 0 && selectedChains.length > 0 : true;

  if (settingsQuery.isLoading || optionsQuery.isLoading) {
    return <div className="text-gray-500">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">启用稳定币收款</h3>
          <p className="text-sm text-gray-500">允许客户使用 USDC/USDT 支付发票</p>
        </div>
        <button
          type="button"
          onClick={() => setEnabled(!enabled)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            enabled ? 'bg-blue-600' : 'bg-gray-200'
          }`}
          role="switch"
          aria-checked={enabled}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {enabled && (
        <>
          {/* Asset Selection */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">选择支持的资产</h4>
            <p className="text-sm text-gray-500 mb-3">选择您希望接收的稳定币类型</p>
            <div className="flex flex-wrap gap-3">
              {optionsQuery.data?.assets.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleAssetToggle(value)}
                  className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
                    selectedAssets.includes(value)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {enabled && selectedAssets.length === 0 && (
              <p className="mt-2 text-sm text-red-500">请至少选择一种资产</p>
            )}
          </div>

          {/* Chain Selection */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">选择支持的链</h4>
            <p className="text-sm text-gray-500 mb-3">选择您希望在哪些区块链上接收付款</p>
            <div className="flex flex-wrap gap-3">
              {optionsQuery.data?.chains.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleChainToggle(value)}
                  className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
                    selectedChains.includes(value)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {enabled && selectedChains.length === 0 && (
              <p className="mt-2 text-sm text-red-500">请至少选择一条链</p>
            )}
          </div>
        </>
      )}

      {/* Save Button */}
      <div className="flex items-center gap-4 pt-4 border-t">
        <Button
          onClick={handleSave}
          disabled={!canSave || saveMutation.isPending}
        >
          {saveMutation.isPending ? '保存中...' : '保存设置'}
        </Button>
        {saveMessage && (
          <span className={`text-sm ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {saveMessage.text}
          </span>
        )}
      </div>

      {/* Generated Addresses */}
      {enabled && addressesQuery.data && addressesQuery.data.length > 0 && (
        <div className="pt-6 border-t">
          <h4 className="text-sm font-medium text-gray-900 mb-3">已生成的收款地址</h4>
          <div className="space-y-3">
            {addressesQuery.data.map((addr) => (
              <div
                key={addr.id}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                    {CHAIN_LABELS[addr.chain]}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 bg-green-100 text-green-700 rounded">
                    {ASSET_LABELS[addr.asset]}
                  </span>
                </div>
                <code className="text-sm text-gray-600 break-all">{addr.address}</code>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
