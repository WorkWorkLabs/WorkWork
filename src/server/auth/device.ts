/**
 * Device fingerprint and trust management service
 * Implements requirements 1.2, 1.3, 1.4
 */

import { createHash } from 'crypto';
import prisma from '@/lib/prisma';
import type { DeviceFingerprint, TrustedDevice } from './types';

/**
 * Generate a hash from device fingerprint components
 */
export function generateFingerprintHash(fingerprint: DeviceFingerprint): string {
  const data = `${fingerprint.userAgent}|${fingerprint.platform}|${fingerprint.timezone}|${fingerprint.language}`;
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Create a DeviceFingerprint object from raw browser data
 */
export function createDeviceFingerprint(
  userAgent: string,
  platform: string,
  timezone: string,
  language: string
): DeviceFingerprint {
  const fingerprint: DeviceFingerprint = {
    hash: '',
    userAgent,
    platform,
    timezone,
    language,
  };
  fingerprint.hash = generateFingerprintHash(fingerprint);
  return fingerprint;
}

/**
 * Check if a device is trusted for a user
 * Requirement 1.3: Trusted device should complete auth directly
 * Requirement 1.4: New device should require additional verification
 */
export async function isDeviceTrusted(userId: string, fingerprintHash: string): Promise<boolean> {
  const device = await prisma.trustedDevice.findFirst({
    where: {
      userId,
      fingerprintHash,
    },
  });

  return device !== null;
}

/**
 * Record a device as trusted for a user
 * Requirement 1.2: Record device fingerprint when user logs in via Magic Link
 */
export async function recordTrustedDevice(
  userId: string,
  fingerprint: DeviceFingerprint,
  deviceName?: string
): Promise<TrustedDevice> {
  // Check if device already exists
  const existingDevice = await prisma.trustedDevice.findFirst({
    where: {
      userId,
      fingerprintHash: fingerprint.hash,
    },
  });

  if (existingDevice) {
    // Update last used time
    const updated = await prisma.trustedDevice.update({
      where: { id: existingDevice.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      id: updated.id,
      fingerprint: updated.fingerprintHash,
      name: updated.deviceName,
      lastUsed: updated.lastUsedAt,
      createdAt: updated.createdAt,
    };
  }

  // Create new trusted device
  const device = await prisma.trustedDevice.create({
    data: {
      userId,
      fingerprintHash: fingerprint.hash,
      deviceName: deviceName || generateDeviceName(fingerprint),
      userAgent: fingerprint.userAgent,
      platform: fingerprint.platform,
      timezone: fingerprint.timezone,
      language: fingerprint.language,
    },
  });

  return {
    id: device.id,
    fingerprint: device.fingerprintHash,
    name: device.deviceName,
    lastUsed: device.lastUsedAt,
    createdAt: device.createdAt,
  };
}

/**
 * Generate a human-readable device name from fingerprint
 */
export function generateDeviceName(fingerprint: DeviceFingerprint): string {
  const platform = fingerprint.platform || 'Unknown';
  const browser = extractBrowserName(fingerprint.userAgent);
  return `${browser} on ${platform}`;
}

/**
 * Extract browser name from user agent string
 */
export function extractBrowserName(userAgent: string): string {
  if (!userAgent) return 'Unknown Browser';

  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Edg')) return 'Edge';
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';

  return 'Unknown Browser';
}

/**
 * Get all trusted devices for a user
 * Requirement 1.7: Display trusted devices list
 */
export async function getTrustedDevices(userId: string): Promise<TrustedDevice[]> {
  const devices = await prisma.trustedDevice.findMany({
    where: { userId },
    orderBy: { lastUsedAt: 'desc' },
  });

  return devices.map((device: typeof devices[number]) => ({
    id: device.id,
    fingerprint: device.fingerprintHash,
    name: device.deviceName,
    lastUsed: device.lastUsedAt,
    createdAt: device.createdAt,
  }));
}

/**
 * Remove a trusted device
 * Requirement 1.7: Allow removing devices from trusted list
 */
export async function removeTrustedDevice(userId: string, deviceId: string): Promise<boolean> {
  const device = await prisma.trustedDevice.findFirst({
    where: {
      id: deviceId,
      userId,
    },
  });

  if (!device) {
    return false;
  }

  await prisma.trustedDevice.delete({
    where: { id: deviceId },
  });

  return true;
}
