/**
 * Alchemy SDK adapter for multi-chain support
 * _需求: 7.1, 7.4_
 */

import { Alchemy, Network, AlchemySubscription } from 'alchemy-sdk';
import { ethers } from 'ethers';
import Decimal from 'decimal.js';
import type { Chain, StablecoinAsset } from '@/types/domain';
import {
  type TransactionDetails,
  type TransactionStatus,
  type AddressSubscriptionCallback,
  ChainError,
  ChainErrorCodes,
} from './types';

/**
 * Chain to Alchemy Network mapping
 */
const CHAIN_TO_NETWORK: Record<Chain, Network> = {
  arbitrum: Network.ARB_MAINNET,
  base: Network.BASE_MAINNET,
  polygon: Network.MATIC_MAINNET,
};

/**
 * Chain to network ID mapping
 */
const CHAIN_TO_NETWORK_ID: Record<Chain, number> = {
  arbitrum: 42161,
  base: 8453,
  polygon: 137,
};

/**
 * USDC contract addresses per chain (mainnet)
 */
const USDC_CONTRACTS: Record<Chain, string> = {
  arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  polygon: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
};

/**
 * USDT contract addresses per chain (mainnet)
 */
const USDT_CONTRACTS: Record<Chain, string> = {
  arbitrum: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  base: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
  polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
};

/**
 * Required confirmations per chain
 */
const REQUIRED_CONFIRMATIONS: Record<Chain, number> = {
  arbitrum: 12,
  base: 12,
  polygon: 128,
};

/**
 * ERC20 Transfer event signature
 */
const ERC20_TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)');

/**
 * Alchemy adapter for blockchain operations
 */
export class AlchemyAdapter {
  private clients: Map<Chain, Alchemy> = new Map();
  private subscriptions: Map<string, { chain: Chain; callback: AddressSubscriptionCallback }> =
    new Map();

  constructor(private apiKey: string) {
    // Initialize Alchemy clients for each chain
    this.initializeClients();
  }

  /**
   * Initialize Alchemy clients for all supported chains
   */
  private initializeClients(): void {
    const chains: Chain[] = ['arbitrum', 'base', 'polygon'];

    for (const chain of chains) {
      const alchemy = new Alchemy({
        apiKey: this.apiKey,
        network: CHAIN_TO_NETWORK[chain],
      });
      this.clients.set(chain, alchemy);
    }
  }

  /**
   * Get Alchemy client for a specific chain
   */
  private getClient(chain: Chain): Alchemy {
    const client = this.clients.get(chain);
    if (!client) {
      throw new ChainError(ChainErrorCodes.INVALID_CHAIN, `Unsupported chain: ${chain}`, {
        chain,
      });
    }
    return client;
  }

  /**
   * Get contract address for a stablecoin on a specific chain
   */
  getContractAddress(chain: Chain, asset: StablecoinAsset): string {
    if (asset === 'USDC') {
      return USDC_CONTRACTS[chain];
    }
    return USDT_CONTRACTS[chain];
  }

  /**
   * Get required confirmations for a chain
   */
  getRequiredConfirmations(chain: Chain): number {
    return REQUIRED_CONFIRMATIONS[chain];
  }

  /**
   * Get network ID for a chain
   */
  getNetworkId(chain: Chain): number {
    return CHAIN_TO_NETWORK_ID[chain];
  }

  /**
   * Generate a new wallet address
   * Note: In production, this would use HD wallet derivation
   * For MVP, we generate a random wallet
   */
  async generateWalletAddress(): Promise<{ address: string; privateKey: string }> {
    const wallet = ethers.Wallet.createRandom();
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
    };
  }

  /**
   * Verify a transaction on the blockchain
   * _需求: 7.4_
   */
  async verifyTransaction(txHash: string, chain: Chain): Promise<TransactionDetails> {
    const client = this.getClient(chain);

    try {
      const tx = await client.core.getTransaction(txHash);
      if (!tx) {
        throw new ChainError(ChainErrorCodes.TRANSACTION_NOT_FOUND, 'Transaction not found', {
          txHash,
          chain,
        });
      }

      const receipt = await client.core.getTransactionReceipt(txHash);
      const block = tx.blockNumber ? await client.core.getBlock(tx.blockNumber) : null;
      const currentBlock = await client.core.getBlockNumber();

      const confirmations = tx.blockNumber ? currentBlock - tx.blockNumber : 0;

      // Parse ERC20 transfer from logs
      const transferDetails = this.parseTransferFromReceipt(receipt, chain);

      const status: TransactionStatus =
        receipt?.status === 1 ? (confirmations >= REQUIRED_CONFIRMATIONS[chain] ? 'confirmed' : 'pending') : 'failed';

      return {
        hash: txHash,
        chain,
        from: transferDetails?.from || tx.from,
        to: transferDetails?.to || tx.to || '',
        asset: transferDetails?.asset || 'USDC',
        amount: transferDetails?.amount || new Decimal(0),
        confirmations,
        timestamp: block ? new Date(block.timestamp * 1000) : new Date(),
        status,
      };
    } catch (error) {
      if (error instanceof ChainError) {
        throw error;
      }
      throw new ChainError(ChainErrorCodes.PROVIDER_ERROR, 'Failed to verify transaction', {
        txHash,
        chain,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Parse ERC20 transfer details from transaction receipt
   */
  private parseTransferFromReceipt(
    receipt: Awaited<ReturnType<Alchemy['core']['getTransactionReceipt']>>,
    chain: Chain
  ): { from: string; to: string; asset: StablecoinAsset; amount: Decimal } | null {
    if (!receipt || !receipt.logs) {
      return null;
    }

    for (const log of receipt.logs) {
      // Check if this is a Transfer event
      if (log.topics[0] !== ERC20_TRANSFER_TOPIC) {
        continue;
      }

      const contractAddress = log.address.toLowerCase();
      let asset: StablecoinAsset | null = null;

      if (contractAddress === USDC_CONTRACTS[chain].toLowerCase()) {
        asset = 'USDC';
      } else if (contractAddress === USDT_CONTRACTS[chain].toLowerCase()) {
        asset = 'USDT';
      }

      if (asset) {
        // Decode transfer event
        // topics[1] = from address (padded)
        // topics[2] = to address (padded)
        // data = amount
        const from = '0x' + log.topics[1].slice(26);
        const to = '0x' + log.topics[2].slice(26);
        
        // USDC and USDT have 6 decimals
        const rawAmount = BigInt(log.data);
        const amount = new Decimal(rawAmount.toString()).div(new Decimal(10).pow(6));

        return { from, to, asset, amount };
      }
    }

    return null;
  }

  /**
   * Get the number of confirmations for a transaction
   * _需求: 7.4_
   */
  async getConfirmations(txHash: string, chain: Chain): Promise<number> {
    const client = this.getClient(chain);

    try {
      const tx = await client.core.getTransaction(txHash);
      if (!tx || !tx.blockNumber) {
        return 0;
      }

      const currentBlock = await client.core.getBlockNumber();
      return currentBlock - tx.blockNumber;
    } catch (error) {
      throw new ChainError(ChainErrorCodes.PROVIDER_ERROR, 'Failed to get confirmations', {
        txHash,
        chain,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Subscribe to incoming transfers for an address
   * _需求: 7.4_
   */
  async subscribeToAddress(
    address: string,
    chain: Chain,
    asset: StablecoinAsset,
    callback: AddressSubscriptionCallback
  ): Promise<void> {
    const client = this.getClient(chain);
    const contractAddress = this.getContractAddress(chain, asset);
    const subscriptionKey = `${chain}:${address}:${asset}`;

    try {
      // Subscribe to pending transactions to the address
      client.ws.on(
        {
          method: AlchemySubscription.PENDING_TRANSACTIONS,
          toAddress: contractAddress,
        },
        async (tx) => {
          // Check if this is a transfer to our address
          if (tx.to?.toLowerCase() === address.toLowerCase()) {
            try {
              const details = await this.verifyTransaction(tx.hash, chain);
              await callback(details);
            } catch {
              // Transaction might not be mined yet, ignore
            }
          }
        }
      );

      this.subscriptions.set(subscriptionKey, { chain, callback });
    } catch (error) {
      throw new ChainError(ChainErrorCodes.SUBSCRIPTION_FAILED, 'Failed to subscribe to address', {
        address,
        chain,
        asset,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Unsubscribe from address notifications
   */
  async unsubscribeFromAddress(address: string, chain: Chain, asset: StablecoinAsset): Promise<void> {
    const subscriptionKey = `${chain}:${address}:${asset}`;
    const client = this.getClient(chain);

    try {
      client.ws.removeAllListeners();
      this.subscriptions.delete(subscriptionKey);
    } catch (error) {
      throw new ChainError(ChainErrorCodes.PROVIDER_ERROR, 'Failed to unsubscribe from address', {
        address,
        chain,
        asset,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Check if an address has received a specific amount
   */
  async checkAddressBalance(
    address: string,
    chain: Chain,
    asset: StablecoinAsset
  ): Promise<Decimal> {
    const client = this.getClient(chain);
    const contractAddress = this.getContractAddress(chain, asset);

    try {
      const balance = await client.core.call({
        to: contractAddress,
        data: `0x70a08231000000000000000000000000${address.slice(2)}`, // balanceOf(address)
      });

      const rawBalance = BigInt(balance);
      // USDC and USDT have 6 decimals
      return new Decimal(rawBalance.toString()).div(new Decimal(10).pow(6));
    } catch (error) {
      throw new ChainError(ChainErrorCodes.PROVIDER_ERROR, 'Failed to check address balance', {
        address,
        chain,
        asset,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * Create an Alchemy adapter instance
 */
export function createAlchemyAdapter(apiKey: string): AlchemyAdapter {
  return new AlchemyAdapter(apiKey);
}
