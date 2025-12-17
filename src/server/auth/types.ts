/**
 * Authentication module types
 */

export interface DeviceFingerprint {
  hash: string;
  userAgent: string;
  platform: string;
  timezone: string;
  language: string;
}

export interface TrustedDevice {
  id: string;
  fingerprint: string;
  name: string | null;
  lastUsed: Date;
  createdAt: Date;
}

export interface Session {
  userId: string;
  email: string;
  deviceId: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface MagicLinkResult {
  success: boolean;
  message: string;
}

export interface TwoFactorSetupResult {
  secret: string;
  qrCode: string;
}

// Magic Link expiration time in milliseconds (15 minutes)
export const MAGIC_LINK_EXPIRATION_MS = 15 * 60 * 1000;

// Magic Link expiration time in minutes
export const MAGIC_LINK_EXPIRATION_MINUTES = 15;
