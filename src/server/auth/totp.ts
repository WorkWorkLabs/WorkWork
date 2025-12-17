/**
 * Two-Factor Authentication (TOTP) service
 * Implements requirements 1.5, 1.6
 */

import * as OTPAuth from 'otpauth';
import * as QRCode from 'qrcode';
import prisma from '@/lib/prisma';
import type { TwoFactorSetupResult } from './types';

// TOTP configuration
const TOTP_ISSUER = 'WorkWork Ledger';
const TOTP_ALGORITHM = 'SHA1';
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30; // seconds

/**
 * Generate a new TOTP secret
 */
export function generateTOTPSecret(): string {
  // Generate a random secret (20 bytes = 160 bits)
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

/**
 * Create a TOTP instance from a secret
 */
export function createTOTP(secret: string, email: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    label: email,
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

/**
 * Generate a TOTP code for the current time window
 */
export function generateTOTPCode(secret: string, email: string): string {
  const totp = createTOTP(secret, email);
  return totp.generate();
}

/**
 * Verify a TOTP code
 * Requirement 1.5: Support TOTP verification (Google Authenticator compatible)
 * Returns true if the code is valid within the current or adjacent time windows
 */
export function verifyTOTPCode(secret: string, email: string, code: string): boolean {
  const totp = createTOTP(secret, email);

  // Validate with a window of 1 (allows for slight time drift)
  // Returns null if invalid, or the time step difference if valid
  const delta = totp.validate({ token: code, window: 1 });

  return delta !== null;
}

/**
 * Generate QR code data URL for TOTP setup
 */
export async function generateQRCode(secret: string, email: string): Promise<string> {
  const totp = createTOTP(secret, email);
  const uri = totp.toString();

  return QRCode.toDataURL(uri);
}

/**
 * Enable 2FA for a user
 * Requirement 1.5: When user enables 2FA, system supports TOTP
 */
export async function enable2FA(userId: string): Promise<TwoFactorSetupResult> {
  // Get user email
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Generate new secret
  const secret = generateTOTPSecret();

  // Generate QR code
  const qrCode = await generateQRCode(secret, user.email);

  // Store secret (not enabled yet - user must verify first)
  await prisma.twoFactorAuth.upsert({
    where: { userId },
    create: {
      userId,
      secret,
      enabled: false,
    },
    update: {
      secret,
      enabled: false,
      enabledAt: null,
    },
  });

  return { secret, qrCode };
}

/**
 * Confirm and activate 2FA after user verifies with a code
 */
export async function confirm2FA(userId: string, code: string): Promise<boolean> {
  const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
    where: { userId },
    include: { user: true },
  });

  if (!twoFactorAuth) {
    return false;
  }

  // Verify the code
  const isValid = verifyTOTPCode(twoFactorAuth.secret, twoFactorAuth.user.email, code);

  if (!isValid) {
    return false;
  }

  // Enable 2FA
  await prisma.twoFactorAuth.update({
    where: { userId },
    data: {
      enabled: true,
      enabledAt: new Date(),
    },
  });

  return true;
}

/**
 * Verify 2FA code during login
 * Requirement 1.6: When 2FA is enabled, require TOTP code after Magic Link
 */
export async function verify2FA(userId: string, code: string): Promise<boolean> {
  const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
    where: { userId },
    include: { user: true },
  });

  if (!twoFactorAuth || !twoFactorAuth.enabled) {
    // 2FA not enabled, consider it verified
    return true;
  }

  return verifyTOTPCode(twoFactorAuth.secret, twoFactorAuth.user.email, code);
}

/**
 * Check if 2FA is enabled for a user
 */
export async function is2FAEnabled(userId: string): Promise<boolean> {
  const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
    where: { userId },
    select: { enabled: true },
  });

  return twoFactorAuth?.enabled ?? false;
}

/**
 * Disable 2FA for a user (requires valid code)
 */
export async function disable2FA(userId: string, code: string): Promise<boolean> {
  const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
    where: { userId },
    include: { user: true },
  });

  if (!twoFactorAuth || !twoFactorAuth.enabled) {
    return false;
  }

  // Verify the code before disabling
  const isValid = verifyTOTPCode(twoFactorAuth.secret, twoFactorAuth.user.email, code);

  if (!isValid) {
    return false;
  }

  // Delete 2FA record
  await prisma.twoFactorAuth.delete({
    where: { userId },
  });

  return true;
}
