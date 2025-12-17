/**
 * Magic Link authentication service
 * Implements requirements 1.1, 1.2, 1.10
 */

import { randomBytes } from 'crypto';
import { Resend } from 'resend';
import prisma from '@/lib/prisma';
import {
  MAGIC_LINK_EXPIRATION_MS,
  MAGIC_LINK_EXPIRATION_MINUTES,
  type MagicLinkResult,
  type DeviceFingerprint,
} from './types';

// Lazy initialization of Resend client
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

/**
 * Generate a secure random token for magic link
 */
export function generateSecureToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Calculate expiration date for magic link (15 minutes from now)
 */
export function calculateExpirationDate(fromDate: Date = new Date()): Date {
  return new Date(fromDate.getTime() + MAGIC_LINK_EXPIRATION_MS);
}

/**
 * Check if a magic link token has expired
 */
export function isTokenExpired(expiresAt: Date, currentTime: Date = new Date()): boolean {
  return currentTime >= expiresAt;
}

/**
 * Send a magic link to the user's email
 * Requirement 1.1: When user submits valid email, system sends Magic Link
 */
export async function sendMagicLink(email: string): Promise<MagicLinkResult> {
  // Find or create user
  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        settings: {
          create: {},
        },
      },
    });
  }

  // Generate secure token
  const token = generateSecureToken();
  const expiresAt = calculateExpirationDate();

  // Store magic link in database
  await prisma.magicLink.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });

  // Build magic link URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const magicLinkUrl = `${baseUrl}/auth/verify?token=${token}`;

  // Send email via Resend
  try {
    await getResendClient().emails.send({
      from: process.env.EMAIL_FROM || 'WorkWork Ledger <noreply@workwork.app>',
      to: email,
      subject: 'Sign in to WorkWork Ledger',
      html: `
        <h1>Sign in to WorkWork Ledger</h1>
        <p>Click the link below to sign in to your account:</p>
        <a href="${magicLinkUrl}">Sign in to WorkWork Ledger</a>
        <p>This link will expire in ${MAGIC_LINK_EXPIRATION_MINUTES} minutes.</p>
        <p>If you didn't request this email, you can safely ignore it.</p>
      `,
    });

    return {
      success: true,
      message: 'Magic link sent successfully',
    };
  } catch (error) {
    console.error('Failed to send magic link email:', error);
    return {
      success: false,
      message: 'Failed to send magic link email',
    };
  }
}

/**
 * Verify a magic link token
 * Requirements 1.2, 1.10: Verify token validity and expiration
 */
export async function verifyMagicLink(
  token: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _deviceFingerprint: DeviceFingerprint
): Promise<{ success: boolean; userId?: string; error?: string }> {
  // Find the magic link
  const magicLink = await prisma.magicLink.findUnique({
    where: { token },
    include: { user: true },
  });

  // Token not found
  if (!magicLink) {
    return {
      success: false,
      error: 'Invalid or expired magic link',
    };
  }

  // Check if already used
  if (magicLink.usedAt) {
    return {
      success: false,
      error: 'Magic link has already been used',
    };
  }

  // Check expiration (Requirement 1.10)
  if (isTokenExpired(magicLink.expiresAt)) {
    return {
      success: false,
      error: 'Magic link has expired. Please request a new one.',
    };
  }

  // Mark as used
  await prisma.magicLink.update({
    where: { id: magicLink.id },
    data: { usedAt: new Date() },
  });

  // Record device fingerprint (will be handled by device service)
  // This is imported from device.ts to avoid circular dependencies

  return {
    success: true,
    userId: magicLink.userId,
  };
}

/**
 * Clean up expired magic links (can be run as a cron job)
 */
export async function cleanupExpiredMagicLinks(): Promise<number> {
  const result = await prisma.magicLink.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }],
    },
  });

  return result.count;
}
