/**
 * Property tests for Magic Link authentication
 * **Feature: workwork-ledger-mvp, Property 1: Magic Link 过期验证**
 * **Validates: Requirements 1.10**
 */

import { describe, it } from 'vitest';
import { fc } from '@/test/fc-config';
import {
  generateSecureToken,
  calculateExpirationDate,
  isTokenExpired,
} from './magic-link';

// 15 minutes in milliseconds as integer
const EXPIRATION_MS = 15 * 60 * 1000;

describe('Magic Link', () => {
  describe('Token Generation', () => {
    it('should generate unique tokens', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 100 }), (count) => {
          const tokens = new Set<string>();
          for (let i = 0; i < count; i++) {
            tokens.add(generateSecureToken());
          }
          // All tokens should be unique
          return tokens.size === count;
        }),
        { numRuns: 100 }
      );
    });

    it('should generate tokens of consistent length (64 hex chars)', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const token = generateSecureToken();
          return token.length === 64 && /^[0-9a-f]+$/.test(token);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Expiration Calculation', () => {
    it('should calculate expiration 15 minutes from given date', () => {
      fc.assert(
        fc.property(
          // Use integer timestamps to avoid floating point issues
          fc.integer({ min: 1577836800000, max: 1893456000000 }), // 2020-01-01 to 2030-01-01
          (timestamp) => {
            const fromDate = new Date(timestamp);
            const expiresAt = calculateExpirationDate(fromDate);
            const expectedExpiration = timestamp + EXPIRATION_MS;
            return expiresAt.getTime() === expectedExpiration;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: workwork-ledger-mvp, Property 1: Magic Link 过期验证**
   * *对于任意* Magic Link token，如果创建时间超过 15 分钟，验证应返回失败
   * **Validates: Requirements 1.10**
   */
  describe('Property 1: Magic Link Expiration Verification', () => {
    it('should return expired=true for tokens older than 15 minutes', () => {
      fc.assert(
        fc.property(
          // Generate a creation timestamp
          fc.integer({ min: 1577836800000, max: 1893456000000 }),
          // Generate time elapsed since creation (in ms), at least 15 minutes + 1ms
          fc.integer({ min: EXPIRATION_MS + 1, max: EXPIRATION_MS * 10 }),
          (creationTimestamp, elapsedMs) => {
            const creationTime = new Date(creationTimestamp);
            const expiresAt = calculateExpirationDate(creationTime);
            const currentTime = new Date(creationTimestamp + elapsedMs);

            // Token should be expired
            return isTokenExpired(expiresAt, currentTime) === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return expired=false for tokens within 15 minutes', () => {
      fc.assert(
        fc.property(
          // Generate a creation timestamp
          fc.integer({ min: 1577836800000, max: 1893456000000 }),
          // Generate time elapsed since creation (in ms), less than 15 minutes
          fc.integer({ min: 0, max: EXPIRATION_MS - 1 }),
          (creationTimestamp, elapsedMs) => {
            const creationTime = new Date(creationTimestamp);
            const expiresAt = calculateExpirationDate(creationTime);
            const currentTime = new Date(creationTimestamp + elapsedMs);

            // Token should NOT be expired
            return isTokenExpired(expiresAt, currentTime) === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return expired=true exactly at expiration time', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1577836800000, max: 1893456000000 }),
          (creationTimestamp) => {
            const creationTime = new Date(creationTimestamp);
            const expiresAt = calculateExpirationDate(creationTime);
            // Current time exactly at expiration
            const currentTime = new Date(expiresAt.getTime());

            // Token should be expired at exactly the expiration time
            return isTokenExpired(expiresAt, currentTime) === true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
