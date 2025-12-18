'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import type { Chain, StablecoinAsset } from '@/types/domain';

interface CryptoPaymentSectionProps {
  token: string;
  invoiceId: string;
  amount: string;
  currency: string;
}

interface WalletAddressInfo {
  address: string;
  chain: Chain;
  asset: StablecoinAsset;
}

interface CryptoPaymentConfig {
  addresses: WalletAddressInfo[];
  supportedChains: Chain[];
  supportedAssets: StablecoinAsset[];
}

const CHAIN_DISPLAY_NAMES: Record<Chain, string> = {
  arbitrum: 'Arbitrum',
  base: 'Base',
  polygon: 'Polygon',
};

const CHAIN_ICONS: Record<Chain, string> = {
  arbitrum: '🔵',
  base: '🔷',
  polygon: '🟣',
};

const ASSET_DISPLAY_NAMES: Record<StablecoinAsset, string> = {
  USDC: 'USDC',
  USDT: 'USDT',
};

/**
 * Crypto Payment Section Component
 * Displays chain selection, wallet address, and QR code for stablecoin payments
 * _需求: 6.3_
 */
export function CryptoPaymentSection({
  token,
  invoiceId,
  amount,
  currency,
}: CryptoPaymentSectionProps) {
  const [config, setConfig] = useState<CryptoPaymentConfig | null>(null);
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<StablecoinAsset>('USDC');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'waiting' | 'confirming' | 'confirmed'>('waiting');
  const [confirmationDetails, setConfirmationDetails] = useState<{
    confirmations: number;
    required: number;
    txHash?: string;
  } | null>(null);

  // Fetch crypto payment configuration
  useEffect(() => {
    async function fetchConfig() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/pay/${token}/crypto-config`);
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to load crypto payment options');
        }

        const data = await response.json();
        setConfig(data);
        
        // Set default selections
        if (data.supportedChains.length > 0) {
          setSelectedChain(data.supportedChains[0]);
        }
        if (data.supportedAssets.length > 0) {
          setSelectedAsset(data.supportedAssets[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load payment options');
      } finally {
        setIsLoading(false);
      }
    }

    fetchConfig();
  }, [token]);

  // Poll for payment status
  useEffect(() => {
    if (!config || paymentStatus === 'confirmed') return;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/pay/${token}/crypto-status`);
        if (!response.ok) return;

        const data = await response.json();

        if (data.status === 'paid' || data.status === 'confirmed') {
          setPaymentStatus('confirmed');
          if (data.details) {
            setConfirmationDetails({
              confirmations: data.details.confirmations,
              required: data.details.required,
              txHash: data.details.txHash,
            });
          }
          // Redirect to success page after a short delay
          setTimeout(() => {
            window.location.href = `/pay/${token}/success`;
          }, 2000);
        } else if (data.status === 'confirming') {
          setPaymentStatus('confirming');
          if (data.details) {
            setConfirmationDetails({
              confirmations: data.details.confirmations,
              required: data.details.required,
              txHash: data.details.txHash,
            });
          }
        }
      } catch {
        // Ignore polling errors
      }
    };

    // Poll every 5 seconds
    const interval = setInterval(pollStatus, 5000);
    // Also poll immediately
    pollStatus();

    return () => clearInterval(interval);
  }, [token, config, paymentStatus]);

  // Get the current wallet address based on selection
  const currentAddress = config?.addresses.find(
    (addr) => addr.chain === selectedChain && addr.asset === selectedAsset
  );

  // Copy address to clipboard
  const handleCopyAddress = async () => {
    if (!currentAddress) return;
    
    try {
      await navigator.clipboard.writeText(currentAddress.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = currentAddress.address;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="text-gray-500 mt-2">Loading payment options...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
        <p className="text-gray-500 text-sm mt-2">
          Please contact the merchant for alternative payment methods.
        </p>
      </div>
    );
  }

  if (!config || config.supportedChains.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Crypto payment is not configured for this invoice.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Asset Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Stablecoin
        </label>
        <div className="flex gap-2">
          {config.supportedAssets.map((asset) => (
            <button
              key={asset}
              onClick={() => setSelectedAsset(asset)}
              className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition-colors ${
                selectedAsset === asset
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              {ASSET_DISPLAY_NAMES[asset]}
            </button>
          ))}
        </div>
      </div>

      {/* Chain Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Network
        </label>
        <div className="grid grid-cols-3 gap-2">
          {config.supportedChains.map((chain) => (
            <button
              key={chain}
              onClick={() => setSelectedChain(chain)}
              className={`py-3 px-4 rounded-lg border-2 text-center transition-colors ${
                selectedChain === chain
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-2xl">{CHAIN_ICONS[chain]}</span>
              <p className={`text-sm font-medium mt-1 ${
                selectedChain === chain ? 'text-purple-700' : 'text-gray-700'
              }`}>
                {CHAIN_DISPLAY_NAMES[chain]}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Payment Details */}
      {currentAddress && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          {/* Amount to Pay */}
          <div className="text-center">
            <p className="text-sm text-gray-500">Amount to Pay</p>
            <p className="text-2xl font-bold text-gray-900">
              {amount} {selectedAsset}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              (Equivalent to {amount} {currency})
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <QRCodeSVG
                value={currentAddress.address}
                size={180}
                level="H"
                includeMargin={true}
              />
            </div>
          </div>

          {/* Wallet Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Send {selectedAsset} to this address on {CHAIN_DISPLAY_NAMES[selectedChain!]}
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono break-all">
                {currentAddress.address}
              </code>
              <Button
                onClick={handleCopyAddress}
                variant="secondary"
                size="sm"
                className="shrink-0"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          {/* Payment Status */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex flex-col items-center gap-2">
              {paymentStatus === 'waiting' && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600">Waiting for payment...</span>
                </div>
              )}
              {paymentStatus === 'confirming' && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-blue-600">Confirming transaction...</span>
                  </div>
                  {confirmationDetails && (
                    <div className="text-xs text-gray-500">
                      {confirmationDetails.confirmations} / {confirmationDetails.required} confirmations
                    </div>
                  )}
                  {confirmationDetails?.txHash && (
                    <div className="text-xs text-gray-400 font-mono truncate max-w-full">
                      TX: {confirmationDetails.txHash.slice(0, 10)}...{confirmationDetails.txHash.slice(-8)}
                    </div>
                  )}
                </>
              )}
              {paymentStatus === 'confirmed' && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">Payment confirmed!</span>
                  </div>
                  <span className="text-xs text-gray-500">Redirecting to success page...</span>
                </>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>⚠️ Only send {selectedAsset} on the {CHAIN_DISPLAY_NAMES[selectedChain!]} network.</p>
            <p>⚠️ Sending other tokens or using wrong network may result in loss of funds.</p>
            <p>⚠️ Payment will be confirmed after sufficient block confirmations.</p>
          </div>
        </div>
      )}
    </div>
  );
}
