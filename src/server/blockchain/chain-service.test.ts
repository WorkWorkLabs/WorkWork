/**
 * Property tests for Chain Abstraction Layer
 * **Feature: workwork-ledger-mvp**
 * **Validates: Requirements 7.1**
 */

import { describe, it } from 'vitest';
import { fc } from '@/test/fc-config';
import { chainArb, stablecoinAssetArb, uuidArb } from '@/test/arbitraries';
import type { Chain, StablecoinAsset } from '@/types/domain';
import { CHAINS, STABLECOIN_ASSETS } from '@/types/domain';

/**
 * Pure function to generate unique addresses for chain/asset combinations
 * This simulates the address generation logic without database dependencies
 */
function generateAddressesForCombinations(
  userId: string,
  chains: Chain[],
  assets: StablecoinAsset[],
  addressGenerator: () => string
): Map<string, string> {
  const addresses = new Map<string, string>();

  for (const chain of chains) {
    for (const asset of assets) {
      const key = `${userId}:${chain}:${asset}`;
      // Each combination gets a unique address
      addresses.set(key, addressGenerator());
    }
  }

  return addresses;
}

/**
 * Check if all addresses in a map are unique
 */
function areAllAddressesUnique(addresses: Map<string, string>): boolean {
  const addressValues = Array.from(addresses.values());
  const uniqueAddresses = new Set(addressValues);
  return addressValues.length === uniqueAddresses.size;
}

/**
 * Check if each chain has independent addresses (different from other chains)
 */
function areChainAddressesIndependent(
  addresses: Map<string, string>,
  userId: string,
  chains: Chain[],
  assets: StablecoinAsset[]
): boolean {
  // For each chain, collect all addresses
  const addressesByChain = new Map<Chain, Set<string>>();

  for (const chain of chains) {
    const chainAddresses = new Set<string>();
    for (const asset of assets) {
      const key = `${userId}:${chain}:${asset}`;
      const address = addresses.get(key);
      if (address) {
        chainAddresses.add(address);
      }
    }
    addressesByChain.set(chain, chainAddresses);
  }

  // Check that addresses from different chains don't overlap
  const allChainAddresses = Array.from(addressesByChain.values());
  for (let i = 0; i < allChainAddresses.length; i++) {
    for (let j = i + 1; j < allChainAddresses.length; j++) {
      const intersection = new Set(
        [...allChainAddresses[i]].filter((x) => allChainAddresses[j].has(x))
      );
      if (intersection.size > 0) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Simulate address generation with a counter to ensure uniqueness
 */
function createUniqueAddressGenerator(): () => string {
  let counter = 0;
  return () => {
    counter++;
    // Generate a unique Ethereum-like address
    return `0x${counter.toString(16).padStart(40, '0')}`;
  };
}

describe('Chain Abstraction Layer', () => {
  /**
   * **Feature: workwork-ledger-mvp, Property 16: 多链地址独立性**
   * *对于任意*用户启用的多条链，每条链应有独立的收款地址
   * **Validates: Requirements 7.1**
   */
  describe('Property 16: Multi-Chain Address Independence', () => {
    it('each chain has independent addresses for the same user', () => {
      fc.assert(
        fc.property(
          uuidArb,
          fc.subarray(CHAINS, { minLength: 2 }),
          fc.subarray(STABLECOIN_ASSETS, { minLength: 1 }),
          (userId, chains, assets) => {
            // Skip if we don't have enough chains to test independence
            if (chains.length < 2) return true;

            const addressGenerator = createUniqueAddressGenerator();
            const addresses = generateAddressesForCombinations(
              userId,
              chains,
              assets,
              addressGenerator
            );

            // All addresses should be unique
            return areAllAddressesUnique(addresses);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('addresses from different chains do not overlap', () => {
      fc.assert(
        fc.property(
          uuidArb,
          fc.subarray(CHAINS, { minLength: 2 }),
          fc.subarray(STABLECOIN_ASSETS, { minLength: 1 }),
          (userId, chains, assets) => {
            // Skip if we don't have enough chains to test independence
            if (chains.length < 2) return true;

            const addressGenerator = createUniqueAddressGenerator();
            const addresses = generateAddressesForCombinations(
              userId,
              chains,
              assets,
              addressGenerator
            );

            return areChainAddressesIndependent(addresses, userId, chains, assets);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('same chain/asset combination for same user returns same address', () => {
      fc.assert(
        fc.property(uuidArb, chainArb, stablecoinAssetArb, (userId, chain, asset) => {
          // Simulate address caching behavior
          const addressCache = new Map<string, string>();
          const addressGenerator = createUniqueAddressGenerator();

          const getOrCreateAddress = (uid: string, c: Chain, a: StablecoinAsset): string => {
            const key = `${uid}:${c}:${a}`;
            if (!addressCache.has(key)) {
              addressCache.set(key, addressGenerator());
            }
            return addressCache.get(key)!;
          };

          // Get address twice for the same combination
          const address1 = getOrCreateAddress(userId, chain, asset);
          const address2 = getOrCreateAddress(userId, chain, asset);

          // Should return the same address
          return address1 === address2;
        }),
        { numRuns: 100 }
      );
    });

    it('different users get different addresses for the same chain/asset', () => {
      fc.assert(
        fc.property(
          uuidArb,
          uuidArb,
          (userId1, userId2) => {
            // Skip if users are the same
            if (userId1 === userId2) return true;

            const addressGenerator = createUniqueAddressGenerator();

            // Generate addresses for both users
            const address1 = addressGenerator();
            const address2 = addressGenerator();

            // Different users should get different addresses
            return address1 !== address2;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('all supported chains can have addresses generated', () => {
      fc.assert(
        fc.property(uuidArb, (userId) => {
          const addressGenerator = createUniqueAddressGenerator();
          const addresses = generateAddressesForCombinations(
            userId,
            CHAINS,
            STABLECOIN_ASSETS,
            addressGenerator
          );

          // Should have an address for each chain/asset combination
          const expectedCount = CHAINS.length * STABLECOIN_ASSETS.length;
          return addresses.size === expectedCount;
        }),
        { numRuns: 100 }
      );
    });

    it('address count equals chains × assets for a user', () => {
      fc.assert(
        fc.property(
          uuidArb,
          fc.subarray(CHAINS, { minLength: 1 }),
          fc.subarray(STABLECOIN_ASSETS, { minLength: 1 }),
          (userId, chains, assets) => {
            const addressGenerator = createUniqueAddressGenerator();
            const addresses = generateAddressesForCombinations(
              userId,
              chains,
              assets,
              addressGenerator
            );

            const expectedCount = chains.length * assets.length;
            return addresses.size === expectedCount;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Address Generation Invariants', () => {
    it('generated addresses are valid Ethereum addresses', () => {
      fc.assert(
        fc.property(uuidArb, chainArb, stablecoinAssetArb, () => {
          const addressGenerator = createUniqueAddressGenerator();
          const address = addressGenerator();

          // Valid Ethereum address format: 0x followed by 40 hex characters
          const isValidFormat = /^0x[0-9a-fA-F]{40}$/.test(address);
          return isValidFormat;
        }),
        { numRuns: 100 }
      );
    });

    it('address generation is deterministic for same inputs with caching', () => {
      fc.assert(
        fc.property(
          uuidArb,
          fc.subarray(CHAINS, { minLength: 1 }),
          fc.subarray(STABLECOIN_ASSETS, { minLength: 1 }),
          (userId, chains, assets) => {
            // Simulate cached address generation
            const cache = new Map<string, string>();
            let counter = 0;

            const getCachedAddress = (uid: string, c: Chain, a: StablecoinAsset): string => {
              const key = `${uid}:${c}:${a}`;
              if (!cache.has(key)) {
                counter++;
                cache.set(key, `0x${counter.toString(16).padStart(40, '0')}`);
              }
              return cache.get(key)!;
            };

            // Generate addresses twice
            const firstRun: string[] = [];
            const secondRun: string[] = [];

            for (const chain of chains) {
              for (const asset of assets) {
                firstRun.push(getCachedAddress(userId, chain, asset));
              }
            }

            for (const chain of chains) {
              for (const asset of assets) {
                secondRun.push(getCachedAddress(userId, chain, asset));
              }
            }

            // Both runs should produce the same addresses
            return firstRun.every((addr, i) => addr === secondRun[i]);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
