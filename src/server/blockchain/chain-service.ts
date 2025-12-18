/**
 * Chain Abstraction Layer Service
 * Implements the ChainAbstractionLayer interface
 * _需求: 2.4, 7.1, 7.4_
 */

import type { Chain, StablecoinAsset } from '@/types/domain';
import { CHAINS, STABLECOIN_ASSETS } from '@/types/domain';
import { prisma } from '@/lib/prisma';
import {
  type ChainAbstractionLayer,
  type WalletAddress,
  type TransactionDetails,
  type AddressSubscriptionCallback,
  ChainError,
  ChainErrorCodes,
} from './types';
import { AlchemyAdapter, createAlchemyAdapter } from './alchemy-adapter';

/**
 * Chain service implementation
 * _需求: 7.1, 7.4_
 */
export class ChainService implements ChainAbstractionLayer {
  private alchemyAdapter: AlchemyAdapter;

  constructor(alchemyApiKey: string) {
    this.alchemyAdapter = createAlchemyAdapter(alchemyApiKey);
  }

  /**
   * Generate a new receiving address for a user on a specific chain
   * _需求: 2.4, 7.1_
   */
  async generateAddress(
    userId: string,
    chain: Chain,
    asset: StablecoinAsset
  ): Promise<WalletAddress> {
    // Validate chain and asset
    if (!CHAINS.includes(chain)) {
      throw new ChainError(ChainErrorCodes.INVALID_CHAIN, `Invalid chain: ${chain}`, { chain });
    }
    if (!STABLECOIN_ASSETS.includes(asset)) {
      throw new ChainError(ChainErrorCodes.INVALID_CHAIN, `Invalid asset: ${asset}`, { asset });
    }

    // Check if address already exists for this user/chain/asset combination
    const existingAddress = await prisma.walletAddress.findUnique({
      where: {
        userId_chain_asset: {
          userId,
          chain,
          asset,
        },
      },
    });

    if (existingAddress) {
      return {
        id: existingAddress.id,
        userId: existingAddress.userId,
        address: existingAddress.address,
        chain: existingAddress.chain as Chain,
        asset: existingAddress.asset as StablecoinAsset,
        createdAt: existingAddress.createdAt,
      };
    }

    try {
      // Generate a new wallet address
      const { address } = await this.alchemyAdapter.generateWalletAddress();

      // Store in database
      const walletAddress = await prisma.walletAddress.create({
        data: {
          userId,
          chain,
          asset,
          address,
        },
      });

      return {
        id: walletAddress.id,
        userId: walletAddress.userId,
        address: walletAddress.address,
        chain: walletAddress.chain as Chain,
        asset: walletAddress.asset as StablecoinAsset,
        createdAt: walletAddress.createdAt,
      };
    } catch (error) {
      if (error instanceof ChainError) {
        throw error;
      }
      throw new ChainError(
        ChainErrorCodes.ADDRESS_GENERATION_FAILED,
        'Failed to generate wallet address',
        {
          userId,
          chain,
          asset,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Get all wallet addresses for a user
   */
  async getAddresses(userId: string): Promise<WalletAddress[]> {
    const addresses = await prisma.walletAddress.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return addresses.map((addr) => ({
      id: addr.id,
      userId: addr.userId,
      address: addr.address,
      chain: addr.chain as Chain,
      asset: addr.asset as StablecoinAsset,
      createdAt: addr.createdAt,
    }));
  }

  /**
   * Get a specific wallet address by chain and asset
   */
  async getAddress(
    userId: string,
    chain: Chain,
    asset: StablecoinAsset
  ): Promise<WalletAddress | null> {
    const address = await prisma.walletAddress.findUnique({
      where: {
        userId_chain_asset: {
          userId,
          chain,
          asset,
        },
      },
    });

    if (!address) {
      return null;
    }

    return {
      id: address.id,
      userId: address.userId,
      address: address.address,
      chain: address.chain as Chain,
      asset: address.asset as StablecoinAsset,
      createdAt: address.createdAt,
    };
  }

  /**
   * Subscribe to incoming transactions for an address
   * _需求: 7.4_
   */
  async subscribeToAddress(
    address: string,
    chain: Chain,
    callback: AddressSubscriptionCallback
  ): Promise<void> {
    // Subscribe for both USDC and USDT
    await this.alchemyAdapter.subscribeToAddress(address, chain, 'USDC', callback);
    await this.alchemyAdapter.subscribeToAddress(address, chain, 'USDT', callback);
  }

  /**
   * Unsubscribe from address notifications
   */
  async unsubscribeFromAddress(address: string, chain: Chain): Promise<void> {
    await this.alchemyAdapter.unsubscribeFromAddress(address, chain, 'USDC');
    await this.alchemyAdapter.unsubscribeFromAddress(address, chain, 'USDT');
  }

  /**
   * Verify a transaction on the blockchain
   * _需求: 7.4_
   */
  async verifyTransaction(txHash: string, chain: Chain): Promise<TransactionDetails> {
    return this.alchemyAdapter.verifyTransaction(txHash, chain);
  }

  /**
   * Get the number of confirmations for a transaction
   * _需求: 7.4_
   */
  async getConfirmations(txHash: string, chain: Chain): Promise<number> {
    return this.alchemyAdapter.getConfirmations(txHash, chain);
  }

  /**
   * Generate addresses for all enabled chains and assets for a user
   * _需求: 7.1_
   */
  async generateAddressesForUser(
    userId: string,
    chains: Chain[],
    assets: StablecoinAsset[]
  ): Promise<WalletAddress[]> {
    const addresses: WalletAddress[] = [];

    for (const chain of chains) {
      for (const asset of assets) {
        const address = await this.generateAddress(userId, chain, asset);
        addresses.push(address);
      }
    }

    return addresses;
  }

  /**
   * Check if addresses exist for all specified chains and assets
   * _需求: 7.1_
   */
  async hasAddressesForChains(
    userId: string,
    chains: Chain[],
    assets: StablecoinAsset[]
  ): Promise<boolean> {
    const addresses = await this.getAddresses(userId);
    
    for (const chain of chains) {
      for (const asset of assets) {
        const hasAddress = addresses.some(
          (addr) => addr.chain === chain && addr.asset === asset
        );
        if (!hasAddress) {
          return false;
        }
      }
    }

    return true;
  }
}

/**
 * Create a chain service instance
 */
export function createChainService(alchemyApiKey?: string): ChainService {
  const apiKey = alchemyApiKey || process.env.ALCHEMY_API_KEY;
  if (!apiKey) {
    throw new Error('ALCHEMY_API_KEY environment variable is required');
  }
  return new ChainService(apiKey);
}

/**
 * Singleton instance for the chain service
 */
let chainServiceInstance: ChainService | null = null;

/**
 * Get the chain service singleton
 */
export function getChainService(): ChainService {
  if (!chainServiceInstance) {
    chainServiceInstance = createChainService();
  }
  return chainServiceInstance;
}
