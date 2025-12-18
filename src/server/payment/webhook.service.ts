/**
 * Webhook Service
 * Handles webhook processing with idempotency
 * _需求: 6.4_
 */

import { prisma } from '@/lib/prisma';
import type { WebhookEvent, PSPProvider } from './types';

/**
 * Result of webhook processing
 */
export interface WebhookProcessResult {
  success: boolean;
  alreadyProcessed: boolean;
  error?: string;
  invoiceId?: string;
}

/**
 * Check if a webhook event has already been processed
 * _需求: 6.4_ - Idempotency handling
 */
export async function isWebhookProcessed(
  provider: PSPProvider | string,
  eventId: string
): Promise<boolean> {
  const existing = await prisma.processedWebhook.findUnique({
    where: {
      provider_eventId: {
        provider,
        eventId,
      },
    },
  });
  return existing !== null;
}

/**
 * Mark a webhook event as processed
 * _需求: 6.4_ - Idempotency handling
 */
export async function markWebhookProcessed(
  provider: PSPProvider | string,
  eventId: string,
  payload?: unknown
): Promise<void> {
  await prisma.processedWebhook.create({
    data: {
      provider,
      eventId,
      payload: payload ? JSON.parse(JSON.stringify(payload)) : null,
    },
  });
}

/**
 * Process a webhook event with idempotency check
 * Returns early if event was already processed
 */
export async function processWebhookWithIdempotency<T>(
  provider: PSPProvider | string,
  eventId: string,
  processor: () => Promise<T>
): Promise<{ result: T | null; alreadyProcessed: boolean }> {
  // Check if already processed
  const alreadyProcessed = await isWebhookProcessed(provider, eventId);
  if (alreadyProcessed) {
    return { result: null, alreadyProcessed: true };
  }

  // Process the event
  const result = await processor();

  // Mark as processed
  await markWebhookProcessed(provider, eventId);

  return { result, alreadyProcessed: false };
}

/**
 * Extract invoice ID from webhook event metadata
 */
export function extractInvoiceIdFromEvent(event: WebhookEvent): string | null {
  return event.data.metadata?.invoiceId || null;
}

/**
 * Webhook event types we care about
 */
export const PAYMENT_SUCCESS_EVENTS = [
  'checkout.session.completed',
  'payment_intent.succeeded',
] as const;

export const PAYMENT_FAILED_EVENTS = [
  'checkout.session.expired',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
] as const;

/**
 * Check if event indicates successful payment
 */
export function isPaymentSuccessEvent(eventType: string): boolean {
  return PAYMENT_SUCCESS_EVENTS.includes(eventType as typeof PAYMENT_SUCCESS_EVENTS[number]);
}

/**
 * Check if event indicates failed payment
 */
export function isPaymentFailedEvent(eventType: string): boolean {
  return PAYMENT_FAILED_EVENTS.includes(eventType as typeof PAYMENT_FAILED_EVENTS[number]);
}
