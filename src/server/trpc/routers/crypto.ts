/**
 * Crypto Settings tRPC router
 * Implements requirements 2.3, 2.4
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import {
  getCryptoSettings,
  saveCryptoSettingsAndGenerateAddresses,
  getWalletAddresses,
  isCryptoEnabled,
} from '@/server/crypto';
import { CHAINS, STABLECOIN_ASSETS } from '@/types/domain';

// Input schemas
const chainSchema = z.enum(['arbitrum', 'base', 'polygon'] as const);
const assetSchema = z.enum(['USDC', 'USDT'] as const);

const cryptoSettingsInputSchema = z.object({
  enabled: z.boolean(),
  enabledAssets: z.array(assetSchema),
  enabledChains: z.array(chainSchema),
});

export const cryptoRouter = router({
  /**
   * Get crypto settings for a user
   * _需求: 2.3_
   */
  getSettings: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      return getCryptoSettings(input.userId);
    }),

  /**
   * Save crypto settings and generate addresses
   * _需求: 2.3, 2.4_
   */
  saveSettings: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        settings: cryptoSettingsInputSchema,
      })
    )
    .mutation(async ({ input }) => {
      return saveCryptoSettingsAndGenerateAddresses(input.userId, input.settings);
    }),

  /**
   * Get wallet addresses for a user
   * _需求: 2.4_
   */
  getAddresses: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      return getWalletAddresses(input.userId);
    }),

  /**
   * Check if crypto is enabled for a user
   */
  isEnabled: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const enabled = await isCryptoEnabled(input.userId);
      return { enabled };
    }),

  /**
   * Get available chains and assets
   */
  getOptions: publicProcedure.query(() => {
    return {
      chains: CHAINS.map(chain => ({
        value: chain,
        label: chain.charAt(0).toUpperCase() + chain.slice(1),
      })),
      assets: STABLECOIN_ASSETS.map(asset => ({
        value: asset,
        label: asset,
      })),
    };
  }),
});
