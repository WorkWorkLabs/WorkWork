/**
 * User settings service
 * Implements requirements 1.8, 1.9
 */

import prisma from '@/lib/prisma';
import type { Currency } from '@/types/domain';

export interface UserSettingsInput {
  businessName?: string | null;
  logoUrl?: string | null;
  country?: string | null;
  defaultCurrency?: Currency;
  estimatedTaxRate?: number;
}

export interface UserSettingsOutput {
  id: string;
  userId: string;
  businessName: string | null;
  logoUrl: string | null;
  country: string | null;
  defaultCurrency: Currency;
  estimatedTaxRate: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get user settings
 * Requirement 1.8: Display editable business name, logo URL, country, default currency
 */
export async function getUserSettings(userId: string): Promise<UserSettingsOutput | null> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  if (!settings) {
    return null;
  }

  return {
    id: settings.id,
    userId: settings.userId,
    businessName: settings.businessName,
    logoUrl: settings.logoUrl,
    country: settings.country,
    defaultCurrency: settings.defaultCurrency as Currency,
    estimatedTaxRate: settings.estimatedTaxRate.toNumber(),
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
  };
}

/**
 * Create user settings (usually done automatically when user is created)
 */
export async function createUserSettings(
  userId: string,
  input: UserSettingsInput = {}
): Promise<UserSettingsOutput> {
  const settings = await prisma.userSettings.create({
    data: {
      userId,
      businessName: input.businessName ?? null,
      logoUrl: input.logoUrl ?? null,
      country: input.country ?? null,
      defaultCurrency: input.defaultCurrency ?? 'USD',
      estimatedTaxRate: input.estimatedTaxRate ?? 0,
    },
  });

  return {
    id: settings.id,
    userId: settings.userId,
    businessName: settings.businessName,
    logoUrl: settings.logoUrl,
    country: settings.country,
    defaultCurrency: settings.defaultCurrency as Currency,
    estimatedTaxRate: settings.estimatedTaxRate.toNumber(),
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
  };
}

/**
 * Update user settings
 * Requirement 1.9: Persist changes within 2 seconds and show confirmation
 */
export async function updateUserSettings(
  userId: string,
  input: UserSettingsInput
): Promise<UserSettingsOutput> {
  // Build update data, only including fields that are provided
  const updateData: Record<string, unknown> = {};

  if (input.businessName !== undefined) {
    updateData.businessName = input.businessName;
  }
  if (input.logoUrl !== undefined) {
    updateData.logoUrl = input.logoUrl;
  }
  if (input.country !== undefined) {
    updateData.country = input.country;
  }
  if (input.defaultCurrency !== undefined) {
    updateData.defaultCurrency = input.defaultCurrency;
  }
  if (input.estimatedTaxRate !== undefined) {
    updateData.estimatedTaxRate = input.estimatedTaxRate;
  }

  const settings = await prisma.userSettings.update({
    where: { userId },
    data: updateData,
  });

  return {
    id: settings.id,
    userId: settings.userId,
    businessName: settings.businessName,
    logoUrl: settings.logoUrl,
    country: settings.country,
    defaultCurrency: settings.defaultCurrency as Currency,
    estimatedTaxRate: settings.estimatedTaxRate.toNumber(),
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
  };
}

/**
 * Ensure user settings exist (create if not)
 */
export async function ensureUserSettings(userId: string): Promise<UserSettingsOutput> {
  const existing = await getUserSettings(userId);

  if (existing) {
    return existing;
  }

  return createUserSettings(userId);
}
