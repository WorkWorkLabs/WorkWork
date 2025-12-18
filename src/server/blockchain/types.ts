/**
 * Chain Abstraction Layer types and interfaces
 * _需求: 7.1, 7.4_
 */

import type { Chain, StablecoinAsset } from '@/types/domain';
import Decimal from 'decimal.js';

/**
 * Transaction status on blockchain
 */
export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

/**
 * Wallet address entity
 * _需求: 7.1_
 */
export interface WalletAddress {
  id: string;
  userId: string;
  address: string;
  chain: Chain;
  asset: StablecoinAsset;
  createdAt: Date;
}

/**
 * Transaction details from blockchain
 * _需求: 7.4_
 */
export interface TransactionDetails {
  hash: string;
  chain: Chain;
  from: string;
  to: string;
  asset: StablecoinAsset;
  amount: Decimal;
  confirmations: number;
  timestamp: Date;
  status: TransactionStatus;
}

/**
 * Address subscription callback
 */
export type AddressSubscriptionCallback = (tx: TransactionDetails) => Promise<void>;

/**
 * Chain Abstraction Layer interface
 * Defines the contract for blockchain integrations
 * _需求: 7.1, 7.4_
 */
export interface ChainAbstractionLayer {
  /**
   * Generate a new receiving address for a user on a specific chain
   * _需求: 7.1_
   */
  generateAddress(userId: string, chain: Chain, asset: StablecoinAsset): Promise<WalletAddress>;

  /**
   * Get all wallet addresses for a user
   */
  getAddresses(userId: string): Promise<WalletAddress[]>;

  /**
   * Get a specific wallet address by chain and asset
   */
  getAddress(userId: string, chain: Chain, asset: StablecoinAsset): Promise<WalletAddress | null>;

  /**
   * Subscribe to incoming transactions for an address
   * _需求: 7.4_
   */
  subscribeToAddress(
    address: string,
    chain: Chain,
    callback: AddressSubscriptionCallback
  ): Promise<void>;

  /**
   * Unsubscribe from address notifications
   */
  unsubscribeFromAddress(address: string, chain: Chain): Promise<void>;

  /**
   * Verify a transaction on the blockchain
   * _需求: 7.4_
   */
  verifyTransaction(txHash: string, chain: Chain): Promise<TransactionDetails>;

  /**
   * Get the number of confirmations for a transaction
   * _需求: 7.4_
   */
  getConfirmations(txHash: string, chain: Chain): Promise<number>;
}

/**
 * Chain configuration
 */
export interface ChainConfig {
  chain: Chain;
  rpcUrl: string;
  networkId: number;
  usdcContractAddress: string;
  usdtContractAddress: string;
  requiredConfirmations: number;
}

/**
 * Alchemy configuration for multi-chain support
 */
export interface AlchemyConfig {
  apiKey: string;
  chains: ChainConfig[];
}

/**
 * Error codes for blockchain operations
 */
export const ChainErrorCodes = {
  ADDRESS_GENERATION_FAILED: 'CHAIN_ADDRESS_GENERATION_FAILED',
  TRANSACTION_NOT_FOUND: 'CHAIN_TRANSACTION_NOT_FOUND',
  INSUFFICIENT_CONFIRMATIONS: 'CHAIN_INSUFFICIENT_CONFIRMATIONS',
  INVALID_CHAIN: 'CHAIN_INVALID_CHAIN',
  SUBSCRIPTION_FAILED: 'CHAIN_SUBSCRIPTION_FAILED',
  PROVIDER_ERROR: 'CHAIN_PROVIDER_ERROR',
} as const;

/**
 * Chain error class
 */
export class ChainError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ChainError';
  }
}
