/**
 * Authentication tRPC router
 * Implements requirements 1.1-1.10
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import {
  sendMagicLink,
  verifyMagicLink,
  createDeviceFingerprint,
  isDeviceTrusted,
  recordTrustedDevice,
  getTrustedDevices,
  removeTrustedDevice,
  enable2FA,
  confirm2FA,
  verify2FA,
  is2FAEnabled,
  disable2FA,
  getUserSettings,
  updateUserSettings,
  ensureUserSettings,
} from '@/server/auth';
// CURRENCIES imported from domain types for reference

// Input schemas
const deviceFingerprintSchema = z.object({
  userAgent: z.string(),
  platform: z.string(),
  timezone: z.string(),
  language: z.string(),
});

const userSettingsInputSchema = z.object({
  businessName: z.string().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  country: z.string().nullable().optional(),
  defaultCurrency: z.enum(['USD', 'EUR', 'HKD', 'GBP', 'JPY'] as const).optional(),
  estimatedTaxRate: z.number().min(0).max(1).optional(),
});

export const authRouter = router({
  /**
   * Send magic link to email
   * Requirement 1.1
   */
  sendMagicLink: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      return sendMagicLink(input.email);
    }),

  /**
   * Verify magic link token
   * Requirements 1.2, 1.10
   */
  verifyMagicLink: publicProcedure
    .input(
      z.object({
        token: z.string(),
        deviceFingerprint: deviceFingerprintSchema,
      })
    )
    .mutation(async ({ input }) => {
      const fingerprint = createDeviceFingerprint(
        input.deviceFingerprint.userAgent,
        input.deviceFingerprint.platform,
        input.deviceFingerprint.timezone,
        input.deviceFingerprint.language
      );

      const result = await verifyMagicLink(input.token, fingerprint);

      if (!result.success || !result.userId) {
        return {
          success: false,
          error: result.error,
          requires2FA: false,
        };
      }

      // Record device as trusted
      await recordTrustedDevice(result.userId, fingerprint);

      // Check if 2FA is required
      const requires2FA = await is2FAEnabled(result.userId);

      return {
        success: true,
        userId: result.userId,
        requires2FA,
      };
    }),

  /**
   * Check if device is trusted
   * Requirements 1.3, 1.4
   */
  checkDeviceTrust: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        deviceFingerprint: deviceFingerprintSchema,
      })
    )
    .query(async ({ input }) => {
      const fingerprint = createDeviceFingerprint(
        input.deviceFingerprint.userAgent,
        input.deviceFingerprint.platform,
        input.deviceFingerprint.timezone,
        input.deviceFingerprint.language
      );

      const isTrusted = await isDeviceTrusted(input.userId, fingerprint.hash);

      return { isTrusted };
    }),

  /**
   * Get trusted devices list
   * Requirement 1.7
   */
  getTrustedDevices: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      return getTrustedDevices(input.userId);
    }),

  /**
   * Remove a trusted device
   * Requirement 1.7
   */
  removeTrustedDevice: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        deviceId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const success = await removeTrustedDevice(input.userId, input.deviceId);
      return { success };
    }),

  /**
   * Enable 2FA - generate secret and QR code
   * Requirement 1.5
   */
  enable2FA: publicProcedure.input(z.object({ userId: z.string() })).mutation(async ({ input }) => {
    return enable2FA(input.userId);
  }),

  /**
   * Confirm 2FA setup with verification code
   * Requirement 1.5
   */
  confirm2FA: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        code: z.string().length(6),
      })
    )
    .mutation(async ({ input }) => {
      const success = await confirm2FA(input.userId, input.code);
      return { success };
    }),

  /**
   * Verify 2FA code during login
   * Requirement 1.6
   */
  verify2FA: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        code: z.string().length(6),
      })
    )
    .mutation(async ({ input }) => {
      const success = await verify2FA(input.userId, input.code);
      return { success };
    }),

  /**
   * Check if 2FA is enabled
   */
  is2FAEnabled: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const enabled = await is2FAEnabled(input.userId);
      return { enabled };
    }),

  /**
   * Disable 2FA
   */
  disable2FA: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        code: z.string().length(6),
      })
    )
    .mutation(async ({ input }) => {
      const success = await disable2FA(input.userId, input.code);
      return { success };
    }),

  /**
   * Get user settings
   * Requirement 1.8
   */
  getSettings: publicProcedure.input(z.object({ userId: z.string() })).query(async ({ input }) => {
    const settings = await getUserSettings(input.userId);
    if (!settings) {
      return ensureUserSettings(input.userId);
    }
    return settings;
  }),

  /**
   * Update user settings
   * Requirement 1.9
   */
  updateSettings: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        settings: userSettingsInputSchema,
      })
    )
    .mutation(async ({ input }) => {
      return updateUserSettings(input.userId, input.settings);
    }),
});
