/**
 * Crypto Transaction Verification Service
 * Verifies on-chain transactions for amount and confirmations
 * _需求: 6.5, 7.4_
 */

import Decimal from 'decimal.js';
import type { Chain, StablecoinAsset } from '@/types/domain';
import { createChainService, type ChainService } from '@/server/blockchain/chain-service';
import type { TransactionDetails } from '@/server/blockchain/types';

/**
 * Required confirmations per chain
 * _需求: 7.4_
 */
export const REQUIRED_CONFIRMATIONS: Record<Chain, number> = {
  arbitrum: 12,
  base: 12,
  polygon: 128,
};

/**
 * Verification result
 */
export interface VerificationResult {
  verified: boolean;
  error?: string;
  details?: {
    txHash: string;
    chain: Chain;
    asset: StablecoinAsset;
    amount: Decimal;
    confirmations: number;
    requiredConfirmations: number;
    fromAddress: string;
    toAddress: string;
    status: 'pending' | 'confirmed' | 'failed';
  };
}

/**
 * Verification parameters
 */
export interface VerificationParams {
  txHash: string;
  chain: Chain;
  expectedAmount: Decimal;
  expectedToAddress: string;
  expectedAsset?: StablecoinAsset;
  /** Tolerance for amount matching (default: 0.01) */
  amountTolerance?: Decimal;
}

/**
 * Crypto Transaction Verification Service
 * _需求: 6.5, 7.4_
 */
export class CryptoVerificationService {
  private chainService: ChainService;

  constructor(chainService?: ChainService) {
    this.chainService = chainService || createChainService();
  }

  /**
   * Verify a transaction on the blockchain
   * Checks amount, recipient address, and confirmations
   * _需求: 6.5, 7.4_
   */
  async verifyTransaction(params: VerificationParams): Promise<VerificationResult> {
    const {
      txHash,
      chain,
      expectedAmount,
      expectedToAddress,
      expectedAsset,
      amountTolerance = new Decimal('0.01'),
    } = params;

    try {
      // Get transaction details from blockchain
      const txDetails = await this.chainService.verifyTransaction(txHash, chain);

      // Verify recipient address
      if (txDetails.to.toLowerCase() !== expectedToAddress.toLowerCase()) {
        return {
          verified: false,
          error: `Recipient address mismatch. Expected: ${expectedToAddress}, Got: ${txDetails.to}`,
          details: this.formatDetails(txDetails, chain),
        };
      }

      // Verify asset if specified
      if (expectedAsset && txDetails.asset !== expectedAsset) {
        return {
          verified: false,
          error: `Asset mismatch. Expected: ${expectedAsset}, Got: ${txDetails.asset}`,
          details: this.formatDetails(txDetails, chain),
        };
      }

      // Verify amount (with tolerance)
      const amountDiff = txDetails.amount.minus(expectedAmount).abs();
      if (amountDiff.greaterThan(amountTolerance)) {
        return {
          verified: false,
          error: `Amount mismatch. Expected: ${expectedAmount.toString()}, Got: ${txDetails.amount.toString()}`,
          details: this.formatDetails(txDetails, chain),
        };
      }

      // Check transaction status
      if (txDetails.status === 'failed') {
        return {
          verified: false,
          error: 'Transaction failed on chain',
          details: this.formatDetails(txDetails, chain),
        };
      }

      // Check confirmations
      const requiredConfirmations = REQUIRED_CONFIRMATIONS[chain];
      if (txDetails.confirmations < requiredConfirmations) {
        return {
          verified: false,
          error: `Insufficient confirmations. Required: ${requiredConfirmations}, Got: ${txDetails.confirmations}`,
          details: this.formatDetails(txDetails, chain),
        };
      }

      // All checks passed
      return {
        verified: true,
        details: this.formatDetails(txDetails, chain),
      };
    } catch (error) {
      return {
        verified: false,
        error: error instanceof Error ? error.message : 'Unknown verification error',
      };
    }
  }

  /**
   * Check if a transaction has sufficient confirmations
   * _需求: 7.4_
   */
  async hasEnoughConfirmations(txHash: string, chain: Chain): Promise<boolean> {
    try {
      const confirmations = await this.chainService.getConfirmations(txHash, chain);
      return confirmations >= REQUIRED_CONFIRMATIONS[chain];
    } catch {
      return false;
    }
  }

  /**
   * Get current confirmation count for a transaction
   * _需求: 7.4_
   */
  async getConfirmationStatus(
    txHash: string,
    chain: Chain
  ): Promise<{
    confirmations: number;
    required: number;
    isConfirmed: boolean;
  }> {
    const confirmations = await this.chainService.getConfirmations(txHash, chain);
    const required = REQUIRED_CONFIRMATIONS[chain];

    return {
      confirmations,
      required,
      isConfirmed: confirmations >= required,
    };
  }

  /**
   * Format transaction details for response
   */
  private formatDetails(
    txDetails: TransactionDetails,
    chain: Chain
  ): VerificationResult['details'] {
    return {
      txHash: txDetails.hash,
      chain,
      asset: txDetails.asset,
      amount: txDetails.amount,
      confirmations: txDetails.confirmations,
      requiredConfirmations: REQUIRED_CONFIRMATIONS[chain],
      fromAddress: txDetails.from,
      toAddress: txDetails.to,
      status: txDetails.status,
    };
  }
}

/**
 * Pure function to check if amount matches within tolerance
 * Used for testing
 */
export function isAmountWithinTolerance(
  actual: Decimal,
  expected: Decimal,
  tolerance: Decimal = new Decimal('0.01')
): boolean {
  return actual.minus(expected).abs().lessThanOrEqualTo(tolerance);
}

/**
 * Pure function to check if confirmations are sufficient
 * Used for testing
 */
export function hasRequiredConfirmations(
  confirmations: number,
  chain: Chain
): boolean {
  return confirmations >= REQUIRED_CONFIRMATIONS[chain];
}

/**
 * Create a verification service instance
 */
export function createVerificationService(chainService?: ChainService): CryptoVerificationService {
  return new CryptoVerificationService(chainService);
}

/**
 * Singleton instance
 */
let verificationServiceInstance: CryptoVerificationService | null = null;

/**
 * Get the verification service singleton
 */
export function getVerificationService(): CryptoVerificationService {
  if (!verificationServiceInstance) {
    verificationServiceInstance = createVerificationService();
  }
  return verificationServiceInstance;
}
