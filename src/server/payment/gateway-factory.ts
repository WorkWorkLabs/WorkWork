/**
 * Payment Gateway Factory
 * Creates appropriate payment gateway based on provider
 */

import type { PaymentGateway, PSPCredentials, PSPProvider } from './types';
import { PaymentError, PaymentErrorCodes } from './types';
import { StripeAdapter } from './stripe-adapter';

/**
 * Registry of payment gateway factories
 */
const gatewayFactories: Record<PSPProvider, (credentials: PSPCredentials) => PaymentGateway> = {
  stripe: (credentials) => new StripeAdapter(credentials),
  airwallex: () => {
    throw new PaymentError(
      PaymentErrorCodes.PROVIDER_ERROR,
      'Airwallex adapter not yet implemented'
    );
  },
};

/**
 * Get a payment gateway instance for the given provider
 */
export function getPaymentGateway(credentials: PSPCredentials): PaymentGateway {
  const factory = gatewayFactories[credentials.provider];
  
  if (!factory) {
    throw new PaymentError(
      PaymentErrorCodes.INVALID_CREDENTIALS,
      `Unsupported payment provider: ${credentials.provider}`
    );
  }

  return factory(credentials);
}

/**
 * Check if a provider is supported
 */
export function isProviderSupported(provider: string): provider is PSPProvider {
  return provider in gatewayFactories;
}
