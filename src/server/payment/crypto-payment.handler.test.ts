/**
 * Crypto Payment Handler Tests
 * Tests for stablecoin payment success handling
 * _需求: 6.5, 7.2_
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import Decimal from 'decimal.js';
import type { Chain, StablecoinAsset, PaymentMethod } from '@/types/domain';
import {
  getPaymentMethodFromAsset,
  createCryptoLedgerMetadata,
  type CryptoPaymentDetails,
} from './crypto-payment.handler';

// Arbitraries for property testing
const chainArb = fc.constantFrom<Chain>('arbitrum', 'base', 'polygon');
const assetArb = fc.constantFrom<StablecoinAsset>('USDC', 'USDT');
const hexCharArb = fc.constantFrom(...'0123456789abcdef'.split(''));
const addressArb = fc.array(hexCharArb, { minLength: 40, maxLength: 40 }).map((chars) => `0x${chars.join('')}`);
const txHashArb = fc.array(hexCharArb, { minLength: 64, maxLength: 64 }).map((chars) => `0x${chars.join('')}`);
const amountArb = fc.integer({ min: 1, max: 100000000 }).map((n) => new Decimal(n).div(100));
const blockNumberArb = fc.nat({ max: 100000000 }).map(String);
const invoiceNumberArb = fc.nat({ max: 999999 }).map((n) => `INV-${n.toString().padStart(6, '0')}`);

const cryptoPaymentDetailsArb: fc.Arbitrary<CryptoPaymentDetails> = fc.record({
  chain: chainArb,
  asset: assetArb,
  txHash: txHashArb,
  fromAddress: addressArb,
  toAddress: addressArb,
  amount: amountArb,
  blockNumber: fc.option(blockNumberArb, { nil: undefined }),
  webhookId: fc.option(fc.uuid(), { nil: undefined }),
});

describe('Crypto Payment Handler', () => {
  describe('getPaymentMethodFromAsset', () => {
    /**
     * **Feature: workwork-ledger-mvp, Property: Payment method from asset**
     * **Validates: Requirements 6.5, 7.2**
     */
    it('should return crypto_usdc for USDC asset', () => {
      fc.assert(
        fc.property(fc.constant('USDC' as StablecoinAsset), (asset) => {
          const result = getPaymentMethodFromAsset(asset);
          expect(result).toBe('crypto_usdc');
        }),
        { numRuns: 10 }
      );
    });

    it('should return crypto_usdt for USDT asset', () => {
      fc.assert(
        fc.property(fc.constant('USDT' as StablecoinAsset), (asset) => {
          const result = getPaymentMethodFromAsset(asset);
          expect(result).toBe('crypto_usdt');
        }),
        { numRuns: 10 }
      );
    });

    /**
     * **Feature: workwork-ledger-mvp, Property: Payment method consistency**
     * **Validates: Requirements 6.5**
     */
    it('should consistently map assets to payment methods', () => {
      fc.assert(
        fc.property(assetArb, (asset) => {
          const result = getPaymentMethodFromAsset(asset);
          
          // Result should be a valid crypto payment method
          expect(['crypto_usdc', 'crypto_usdt']).toContain(result);
          
          // Mapping should be deterministic
          const result2 = getPaymentMethodFromAsset(asset);
          expect(result).toBe(result2);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('createCryptoLedgerMetadata', () => {
    /**
     * **Feature: workwork-ledger-mvp, Property: Ledger metadata contains chain info**
     * **Validates: Requirements 7.2**
     */
    it('should include all chain-specific details in metadata', () => {
      fc.assert(
        fc.property(cryptoPaymentDetailsArb, invoiceNumberArb, (details, invoiceNumber) => {
          const metadata = createCryptoLedgerMetadata(details, invoiceNumber);

          // All required fields should be present
          expect(metadata.chain).toBe(details.chain);
          expect(metadata.asset).toBe(details.asset);
          expect(metadata.txHash).toBe(details.txHash);
          expect(metadata.fromAddress).toBe(details.fromAddress);
          expect(metadata.toAddress).toBe(details.toAddress);
          expect(metadata.invoiceNumber).toBe(invoiceNumber);
          
          // Optional fields
          if (details.blockNumber !== undefined) {
            expect(metadata.blockNumber).toBe(details.blockNumber);
          }
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: workwork-ledger-mvp, Property: Metadata is deterministic**
     * **Validates: Requirements 7.2**
     */
    it('should produce consistent metadata for same inputs', () => {
      fc.assert(
        fc.property(cryptoPaymentDetailsArb, invoiceNumberArb, (details, invoiceNumber) => {
          const metadata1 = createCryptoLedgerMetadata(details, invoiceNumber);
          const metadata2 = createCryptoLedgerMetadata(details, invoiceNumber);

          expect(metadata1).toEqual(metadata2);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Payment Method Mapping', () => {
    /**
     * **Feature: workwork-ledger-mvp, Property: All assets map to valid payment methods**
     * **Validates: Requirements 6.5**
     */
    it('should map all supported assets to valid payment methods', () => {
      const supportedAssets: StablecoinAsset[] = ['USDC', 'USDT'];
      const validPaymentMethods: PaymentMethod[] = ['crypto_usdc', 'crypto_usdt'];

      for (const asset of supportedAssets) {
        const method = getPaymentMethodFromAsset(asset);
        expect(validPaymentMethods).toContain(method);
      }
    });

    /**
     * **Feature: workwork-ledger-mvp, Property: Asset to method mapping is bijective**
     * **Validates: Requirements 6.5**
     */
    it('should have unique payment method for each asset', () => {
      const usdcMethod = getPaymentMethodFromAsset('USDC');
      const usdtMethod = getPaymentMethodFromAsset('USDT');

      expect(usdcMethod).not.toBe(usdtMethod);
    });
  });
});
