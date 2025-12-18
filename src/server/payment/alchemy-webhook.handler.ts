/**
 * Alchemy Webhook Handler
 * Processes Alchemy webhook events for USDC/USDT transfers
 * _需求: 6.5_
 */

import { prisma } from '@/lib/prisma';
import Decimal from 'decimal.js';
import type { Chain, StablecoinAsset } from '@/types/domain';
import { processWebhookWithIdempotency } from './webhook.service';
import { handleCryptoPaymentSuccess } from './crypto-payment.handler';

/**
 * Alchemy webhook event types
 */
export type AlchemyWebhookType = 
  | 'ADDRESS_ACTIVITY'
  | 'MINED_TRANSACTION'
  | 'DROPPED_TRANSACTION';

/**
 * Alchemy address activity event
 */
export interface AlchemyAddressActivityEvent {
  webhookId: string;
  id: string;
  createdAt: string;
  type: 'ADDRESS_ACTIVITY';
  event: {
    network: string;
    activity: AlchemyActivity[];
  };
}

/**
 * Alchemy activity details
 */
export interface AlchemyActivity {
  fromAddress: string;
  toAddress: string;
  blockNum: string;
  hash: string;
  value: number;
  asset: string;
  category: 'token' | 'erc20' | 'erc721' | 'erc1155' | 'internal' | 'external';
  rawContract: {
    rawValue: string;
    address: string;
    decimals: number;
  };
  log?: {
    address: string;
    topics: string[];
    data: string;
    blockNumber: string;
    transactionHash: string;
    transactionIndex: string;
    blockHash: string;
    logIndex: string;
    removed: boolean;
  };
}

/**
 * Network to Chain mapping
 */
const NETWORK_TO_CHAIN: Record<string, Chain> = {
  'ARB_MAINNET': 'arbitrum',
  'ARB-MAINNET': 'arbitrum',
  'BASE_MAINNET': 'base',
  'BASE-MAINNET': 'base',
  'MATIC_MAINNET': 'polygon',
  'MATIC-MAINNET': 'polygon',
  'POLYGON_MAINNET': 'polygon',
  'POLYGON-MAINNET': 'polygon',
};

/**
 * USDC contract addresses per chain (mainnet) - lowercase for comparison
 */
const USDC_CONTRACTS: Record<Chain, string> = {
  arbitrum: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
  base: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  polygon: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
};

/**
 * USDT contract addresses per chain (mainnet) - lowercase for comparison
 */
const USDT_CONTRACTS: Record<Chain, string> = {
  arbitrum: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
  base: '0xfde4c96c8593536e31f229ea8f37b2ada2699bb2',
  polygon: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
};

/**
 * Result of webhook processing
 */
export interface AlchemyWebhookResult {
  success: boolean;
  error?: string;
  processedActivities?: number;
}

/**
 * Determine the stablecoin asset from contract address
 */
function getAssetFromContract(contractAddress: string, chain: Chain): StablecoinAsset | null {
  const normalizedAddress = contractAddress.toLowerCase();
  
  if (normalizedAddress === USDC_CONTRACTS[chain]) {
    return 'USDC';
  }
  if (normalizedAddress === USDT_CONTRACTS[chain]) {
    return 'USDT';
  }
  
  return null;
}

/**
 * Process Alchemy webhook payload
 * _需求: 6.5_
 */
export async function processAlchemyWebhook(
  payload: AlchemyAddressActivityEvent | Record<string, unknown>
): Promise<AlchemyWebhookResult> {
  try {
    // Validate payload type
    if (!payload || typeof payload !== 'object') {
      return { success: false, error: 'Invalid payload' };
    }

    const event = payload as AlchemyAddressActivityEvent;

    // Only process ADDRESS_ACTIVITY events
    if (event.type !== 'ADDRESS_ACTIVITY') {
      console.log(`[Alchemy Webhook] Skipping non-activity event: ${event.type}`);
      return { success: true, processedActivities: 0 };
    }

    // Get chain from network
    const network = event.event?.network;
    if (!network) {
      return { success: false, error: 'Missing network in event' };
    }

    const chain = NETWORK_TO_CHAIN[network.toUpperCase()];
    if (!chain) {
      console.log(`[Alchemy Webhook] Unsupported network: ${network}`);
      return { success: true, processedActivities: 0 };
    }

    // Process each activity
    const activities = event.event?.activity || [];
    let processedCount = 0;

    for (const activity of activities) {
      // Only process ERC20 token transfers
      if (activity.category !== 'token' && activity.category !== 'erc20') {
        continue;
      }

      // Get contract address
      const contractAddress = activity.rawContract?.address || activity.log?.address;
      if (!contractAddress) {
        continue;
      }

      // Determine the asset
      const asset = getAssetFromContract(contractAddress, chain);
      if (!asset) {
        // Not a supported stablecoin
        continue;
      }

      // Process with idempotency
      const eventId = `${event.id}-${activity.hash}`;
      
      await processWebhookWithIdempotency('alchemy', eventId, async () => {
        return processStablecoinTransfer(activity, chain, asset, event.id);
      });

      processedCount++;
    }

    return { success: true, processedActivities: processedCount };
  } catch (error) {
    console.error('[Alchemy Webhook] Error processing webhook:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process a stablecoin transfer activity
 */
async function processStablecoinTransfer(
  activity: AlchemyActivity,
  chain: Chain,
  asset: StablecoinAsset,
  webhookId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const toAddress = activity.toAddress.toLowerCase();
    const txHash = activity.hash;

    // Find the wallet address in our database
    const walletAddress = await prisma.walletAddress.findFirst({
      where: {
        address: {
          equals: toAddress,
          mode: 'insensitive',
        },
        chain,
        asset,
      },
      include: {
        user: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!walletAddress) {
      // Not one of our addresses
      console.log(`[Alchemy Webhook] Address ${toAddress} not found in database`);
      return { success: true };
    }

    // Calculate the amount (USDC/USDT have 6 decimals)
    const decimals = activity.rawContract?.decimals || 6;
    const rawValue = activity.rawContract?.rawValue || '0';
    const amount = new Decimal(rawValue).div(new Decimal(10).pow(decimals));

    // Find pending invoices for this user that allow crypto payment
    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        userId: walletAddress.userId,
        status: { in: ['sent', 'overdue'] },
        allowCryptoPayment: true,
      },
      include: {
        client: true,
        payment: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Find an invoice that matches the amount
    const matchingInvoice = pendingInvoices.find((invoice) => {
      const invoiceTotal = new Decimal(invoice.total.toString());
      // Allow small tolerance for rounding (0.01)
      return amount.minus(invoiceTotal).abs().lessThanOrEqualTo(0.01);
    });

    if (!matchingInvoice) {
      console.log(
        `[Alchemy Webhook] No matching invoice found for amount ${amount.toString()} ${asset}`
      );
      // Still return success - we received the payment but couldn't match it
      // In production, this would trigger an alert for manual review
      return { success: true };
    }

    // Process the crypto payment
    const result = await handleCryptoPaymentSuccess(matchingInvoice.id, {
      chain,
      asset,
      txHash,
      fromAddress: activity.fromAddress,
      toAddress: activity.toAddress,
      amount,
      blockNumber: activity.blockNum,
      webhookId,
    });

    return result;
  } catch (error) {
    console.error('[Alchemy Webhook] Error processing transfer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
