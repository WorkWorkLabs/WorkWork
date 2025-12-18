/**
 * Crypto Settings Service
 * Implements requirements 2.3, 2.4
 */

import prisma from '@/lib/prisma';
import type { Chain, StablecoinAsset } from '@/types/domain';
import { CHAINS, STABLECOIN_ASSETS } from '@/types/domain';
import { getChainService } from '@/server/blockchain/chain-service';

/**
 * Crypto settings structure stored in UserSettings.cryptoSettings JSON field
 */
export interface CryptoSettings {
  enabled: boolean;
  enabledAssets: StablecoinAsset[];
  enabledChains: Chain[];
}

/**
 * Default crypto settings
 */
export const DEFAULT_CRYPTO_SETTINGS: CryptoSettings = {
  enabled: false,
  enabledAssets: [],
  enabledChains: [],
};

/**
 * Wallet address with chain and asset info
 */
export interface WalletAddressInfo {
  id: string;
  chain: Chain;
  asset: StablecoinAsset;
  address: string;
  createdAt: Date;
}

/**
 * Get crypto settings for a user
 * _需求: 2.3_
 */
export async function getCryptoSettings(userId: string): Promise<CryptoSettings> {
  const userSettings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { cryptoSettings: true },
  });

  if (!userSettings?.cryptoSettings) {
    return DEFAULT_CRYPTO_SETTINGS;
  }

  // Parse and validate the stored settings
  const stored = userSettings.cryptoSettings as Record<string, unknown>;
  
  return {
    enabled: typeof stored.enabled === 'boolean' ? stored.enabled : false,
    enabledAssets: Array.isArray(stored.enabledAssets) 
      ? stored.enabledAssets.filter((a): a is StablecoinAsset => STABLECOIN_ASSETS.includes(a as StablecoinAsset))
      : [],
    enabledChains: Array.isArray(stored.enabledChains)
      ? stored.enabledChains.filter((c): c is Chain => CHAINS.includes(c as Chain))
      : [],
  };
}

/**
 * Update crypto settings for a user
 * _需求: 2.3_
 */
export async function updateCryptoSettings(
  userId: string,
  settings: Partial<CryptoSettings>
): Promise<CryptoSettings> {
  // Get current settings
  const currentSettings = await getCryptoSettings(userId);
  
  // Merge with new settings
  const newSettings: CryptoSettings = {
    enabled: settings.enabled ?? currentSettings.enabled,
    enabledAssets: settings.enabledAssets ?? currentSettings.enabledAssets,
    enabledChains: settings.enabledChains ?? currentSettings.enabledChains,
  };

  // Validate assets and chains
  newSettings.enabledAssets = newSettings.enabledAssets.filter(a => STABLECOIN_ASSETS.includes(a));
  newSettings.enabledChains = newSettings.enabledChains.filter(c => CHAINS.includes(c));

  // If enabled but no assets or chains selected, disable
  if (newSettings.enabled && (newSettings.enabledAssets.length === 0 || newSettings.enabledChains.length === 0)) {
    newSettings.enabled = false;
  }

  // Update in database
  await prisma.userSettings.update({
    where: { userId },
    data: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cryptoSettings: newSettings as any,
    },
  });

  return newSettings;
}

/**
 * Save crypto settings and generate addresses for enabled chains/assets
 * _需求: 2.4_
 */
export async function saveCryptoSettingsAndGenerateAddresses(
  userId: string,
  settings: CryptoSettings
): Promise<{ settings: CryptoSettings; addresses: WalletAddressInfo[] }> {
  // Update settings first
  const updatedSettings = await updateCryptoSettings(userId, settings);

  // If not enabled, return empty addresses
  if (!updatedSettings.enabled) {
    return { settings: updatedSettings, addresses: [] };
  }

  // Generate addresses for all enabled chain/asset combinations
  const chainService = getChainService();
  const addresses: WalletAddressInfo[] = [];

  for (const chain of updatedSettings.enabledChains) {
    for (const asset of updatedSettings.enabledAssets) {
      try {
        const walletAddress = await chainService.generateAddress(userId, chain, asset);
        addresses.push({
          id: walletAddress.id,
          chain: walletAddress.chain,
          asset: walletAddress.asset,
          address: walletAddress.address,
          createdAt: walletAddress.createdAt,
        });
      } catch (error) {
        console.error(`Failed to generate address for ${chain}/${asset}:`, error);
        // Continue with other addresses even if one fails
      }
    }
  }

  return { settings: updatedSettings, addresses };
}

/**
 * Get all wallet addresses for a user
 * _需求: 2.4_
 */
export async function getWalletAddresses(userId: string): Promise<WalletAddressInfo[]> {
  const addresses = await prisma.walletAddress.findMany({
    where: { userId },
    orderBy: [{ chain: 'asc' }, { asset: 'asc' }],
  });

  return addresses.map(addr => ({
    id: addr.id,
    chain: addr.chain as Chain,
    asset: addr.asset as StablecoinAsset,
    address: addr.address,
    createdAt: addr.createdAt,
  }));
}

/**
 * Check if crypto payments are enabled for a user
 */
export async function isCryptoEnabled(userId: string): Promise<boolean> {
  const settings = await getCryptoSettings(userId);
  return settings.enabled && settings.enabledAssets.length > 0 && settings.enabledChains.length > 0;
}
