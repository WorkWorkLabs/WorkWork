/**
 * Property tests for TOTP (Two-Factor Authentication)
 * **Feature: workwork-ledger-mvp, Property 3: TOTP 验证正确性**
 * **Validates: Requirements 1.5**
 */

import { describe, it } from 'vitest';
import { fc } from '@/test/fc-config';
import { generateTOTPSecret, createTOTP, generateTOTPCode, verifyTOTPCode } from './totp';

// Arbitrary for email addresses - use simple constant emails for performance
const emailArb = fc.constantFrom(
  'user@gmail.com',
  'test@example.com',
  'admin@test.org',
  'john.doe@company.io',
  'alice@workwork.app'
);

describe('TOTP (Two-Factor Authentication)', () => {
  describe('Secret Generation', () => {
    it('should generate valid base32 secrets', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const secret = generateTOTPSecret();
          // Base32 alphabet: A-Z and 2-7
          return secret.length > 0 && /^[A-Z2-7]+$/.test(secret);
        }),
        { numRuns: 100 }
      );
    });

    it('should generate unique secrets', () => {
      fc.assert(
        fc.property(fc.integer({ min: 2, max: 50 }), (count) => {
          const secrets = new Set<string>();
          for (let i = 0; i < count; i++) {
            secrets.add(generateTOTPSecret());
          }
          // All secrets should be unique
          return secrets.size === count;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('TOTP Creation', () => {
    it('should create TOTP instance with correct configuration', () => {
      fc.assert(
        fc.property(emailArb, (email) => {
          const secret = generateTOTPSecret();
          const totp = createTOTP(secret, email);

          // Verify TOTP configuration
          return (
            totp.issuer === 'WorkWork Ledger' &&
            totp.label === email &&
            totp.digits === 6 &&
            totp.period === 30
          );
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Code Generation', () => {
    it('should generate 6-digit codes', () => {
      fc.assert(
        fc.property(emailArb, (email) => {
          const secret = generateTOTPSecret();
          const code = generateTOTPCode(secret, email);

          // TOTP codes should be exactly 6 digits
          return code.length === 6 && /^\d{6}$/.test(code);
        }),
        { numRuns: 100 }
      );
    });

    it('should generate consistent codes for same secret and time', () => {
      fc.assert(
        fc.property(emailArb, (email) => {
          const secret = generateTOTPSecret();

          // Generate code twice in quick succession (same time window)
          const code1 = generateTOTPCode(secret, email);
          const code2 = generateTOTPCode(secret, email);

          // Codes should be the same within the same time window
          return code1 === code2;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: workwork-ledger-mvp, Property 3: TOTP 验证正确性**
   * *对于任意* TOTP secret 和当前时间窗口，使用该 secret 生成的验证码应能通过验证
   * **Validates: Requirements 1.5**
   */
  describe('Property 3: TOTP Verification Correctness', () => {
    it('generated code should pass verification', () => {
      fc.assert(
        fc.property(emailArb, (email) => {
          const secret = generateTOTPSecret();
          const code = generateTOTPCode(secret, email);

          // The generated code should verify successfully
          return verifyTOTPCode(secret, email, code) === true;
        }),
        { numRuns: 100 }
      );
    });

    it('wrong code should fail verification', () => {
      fc.assert(
        fc.property(
          emailArb,
          // Generate a 6-digit number as string
          fc.integer({ min: 0, max: 999999 }).map((n) => n.toString().padStart(6, '0')),
          (email, randomCode) => {
            const secret = generateTOTPSecret();
            const correctCode = generateTOTPCode(secret, email);

            // If random code happens to match, skip this test case
            if (randomCode === correctCode) {
              return true;
            }

            // Wrong code should fail verification
            return verifyTOTPCode(secret, email, randomCode) === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('code from different secret should fail verification', () => {
      fc.assert(
        fc.property(emailArb, (email) => {
          const secret1 = generateTOTPSecret();
          const secret2 = generateTOTPSecret();

          // Generate code with secret1
          const code = generateTOTPCode(secret1, email);

          // Verify with secret2 should fail (unless secrets happen to be the same)
          if (secret1 === secret2) {
            return true; // Skip if secrets are the same (extremely unlikely)
          }

          return verifyTOTPCode(secret2, email, code) === false;
        }),
        { numRuns: 100 }
      );
    });

    it('verification should be deterministic', () => {
      fc.assert(
        fc.property(emailArb, fc.integer({ min: 1, max: 10 }), (email, iterations) => {
          const secret = generateTOTPSecret();
          const code = generateTOTPCode(secret, email);

          // Verify multiple times - should always return the same result
          const results: boolean[] = [];
          for (let i = 0; i < iterations; i++) {
            results.push(verifyTOTPCode(secret, email, code));
          }

          // All results should be true
          return results.every((r) => r === true);
        }),
        { numRuns: 100 }
      );
    });
  });
});
