/**
 * Property tests for Device fingerprint and trust management
 * **Feature: workwork-ledger-mvp, Property 2: 设备信任检测一致性**
 * **Validates: Requirements 1.3, 1.4**
 */

import { describe, it, expect } from 'vitest';
import { fc } from '@/test/fc-config';
import {
  generateFingerprintHash,
  createDeviceFingerprint,
  generateDeviceName,
  extractBrowserName,
} from './device';
import type { DeviceFingerprint } from './types';

// Arbitrary for device fingerprint components
const userAgentArb = fc.oneof(
  fc.constant('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0'),
  fc.constant('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15'),
  fc.constant('Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/121.0'),
  fc.constant('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edg/120.0.0.0'),
  fc.string({ minLength: 10, maxLength: 200 })
);

const platformArb = fc.oneof(
  fc.constant('Win32'),
  fc.constant('MacIntel'),
  fc.constant('Linux x86_64'),
  fc.constant('iPhone'),
  fc.constant('Android'),
  fc.string({ minLength: 1, maxLength: 50 })
);

const timezoneArb = fc.oneof(
  fc.constant('America/New_York'),
  fc.constant('Europe/London'),
  fc.constant('Asia/Shanghai'),
  fc.constant('Asia/Tokyo'),
  fc.string({ minLength: 1, maxLength: 50 })
);

const languageArb = fc.oneof(
  fc.constant('en-US'),
  fc.constant('zh-CN'),
  fc.constant('ja-JP'),
  fc.constant('de-DE'),
  fc.string({ minLength: 2, maxLength: 10 })
);

const deviceFingerprintComponentsArb = fc.record({
  userAgent: userAgentArb,
  platform: platformArb,
  timezone: timezoneArb,
  language: languageArb,
});

describe('Device Fingerprint', () => {
  describe('Hash Generation', () => {
    /**
     * **Feature: workwork-ledger-mvp, Property 2: 设备信任检测一致性**
     * *对于任意*用户和设备指纹，如果该指纹已在信任列表中，isDeviceTrusted 应返回 true；否则返回 false
     * **Validates: Requirements 1.3, 1.4**
     *
     * This test verifies the deterministic nature of fingerprint hashing,
     * which is the foundation for device trust detection consistency.
     */
    it('should generate consistent hash for same fingerprint components', () => {
      fc.assert(
        fc.property(deviceFingerprintComponentsArb, (components) => {
          const fingerprint1 = createDeviceFingerprint(
            components.userAgent,
            components.platform,
            components.timezone,
            components.language
          );

          const fingerprint2 = createDeviceFingerprint(
            components.userAgent,
            components.platform,
            components.timezone,
            components.language
          );

          // Same components should produce same hash
          return fingerprint1.hash === fingerprint2.hash;
        }),
        { numRuns: 100 }
      );
    });

    it('should generate different hashes for different fingerprint components', () => {
      fc.assert(
        fc.property(
          deviceFingerprintComponentsArb,
          deviceFingerprintComponentsArb,
          (components1, components2) => {
            // Skip if components are identical
            if (
              components1.userAgent === components2.userAgent &&
              components1.platform === components2.platform &&
              components1.timezone === components2.timezone &&
              components1.language === components2.language
            ) {
              return true; // Skip this case
            }

            const fingerprint1 = createDeviceFingerprint(
              components1.userAgent,
              components1.platform,
              components1.timezone,
              components1.language
            );

            const fingerprint2 = createDeviceFingerprint(
              components2.userAgent,
              components2.platform,
              components2.timezone,
              components2.language
            );

            // Different components should produce different hashes
            return fingerprint1.hash !== fingerprint2.hash;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate valid SHA-256 hash (64 hex characters)', () => {
      fc.assert(
        fc.property(deviceFingerprintComponentsArb, (components) => {
          const fingerprint = createDeviceFingerprint(
            components.userAgent,
            components.platform,
            components.timezone,
            components.language
          );

          // SHA-256 produces 64 hex characters
          return fingerprint.hash.length === 64 && /^[0-9a-f]+$/.test(fingerprint.hash);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Device Name Generation', () => {
    it('should generate human-readable device names', () => {
      fc.assert(
        fc.property(deviceFingerprintComponentsArb, (components) => {
          const fingerprint = createDeviceFingerprint(
            components.userAgent,
            components.platform,
            components.timezone,
            components.language
          );

          const deviceName = generateDeviceName(fingerprint);

          // Device name should be non-empty and contain "on"
          return deviceName.length > 0 && deviceName.includes(' on ');
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Browser Name Extraction', () => {
    it('should extract known browser names correctly', () => {
      const testCases = [
        { userAgent: 'Mozilla/5.0 Chrome/120.0.0.0', expected: 'Chrome' },
        { userAgent: 'Mozilla/5.0 Firefox/121.0', expected: 'Firefox' },
        { userAgent: 'Mozilla/5.0 Safari/605.1.15', expected: 'Safari' },
        { userAgent: 'Mozilla/5.0 Edg/120.0.0.0', expected: 'Edge' },
        { userAgent: 'Mozilla/5.0 OPR/120.0.0.0', expected: 'Opera' },
        { userAgent: 'Mozilla/5.0 Opera/120.0.0.0', expected: 'Opera' },
      ];

      for (const { userAgent, expected } of testCases) {
        expect(extractBrowserName(userAgent)).toBe(expected);
      }
    });

    it('should return "Unknown Browser" for unrecognized user agents', () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 1, maxLength: 100 })
            .filter(
              (s) =>
                !s.includes('Chrome') &&
                !s.includes('Firefox') &&
                !s.includes('Safari') &&
                !s.includes('Edg') &&
                !s.includes('Opera') &&
                !s.includes('OPR')
            ),
          (userAgent) => {
            const browserName = extractBrowserName(userAgent);
            return browserName === 'Unknown Browser';
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: workwork-ledger-mvp, Property 2: 设备信任检测一致性**
   * This property verifies that the fingerprint hash function is pure and deterministic,
   * which ensures that device trust detection will be consistent.
   */
  describe('Property 2: Device Trust Detection Consistency', () => {
    it('fingerprint hash is deterministic - same input always produces same output', () => {
      fc.assert(
        fc.property(
          deviceFingerprintComponentsArb,
          fc.integer({ min: 1, max: 10 }),
          (components, iterations) => {
            const hashes = new Set<string>();

            for (let i = 0; i < iterations; i++) {
              const fingerprint: DeviceFingerprint = {
                hash: '',
                userAgent: components.userAgent,
                platform: components.platform,
                timezone: components.timezone,
                language: components.language,
              };
              const hash = generateFingerprintHash(fingerprint);
              hashes.add(hash);
            }

            // All iterations should produce the same hash
            return hashes.size === 1;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('fingerprint components are preserved in created fingerprint', () => {
      fc.assert(
        fc.property(deviceFingerprintComponentsArb, (components) => {
          const fingerprint = createDeviceFingerprint(
            components.userAgent,
            components.platform,
            components.timezone,
            components.language
          );

          return (
            fingerprint.userAgent === components.userAgent &&
            fingerprint.platform === components.platform &&
            fingerprint.timezone === components.timezone &&
            fingerprint.language === components.language &&
            fingerprint.hash.length === 64
          );
        }),
        { numRuns: 100 }
      );
    });
  });
});
