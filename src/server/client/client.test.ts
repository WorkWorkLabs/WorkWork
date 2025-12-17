/**
 * Property tests for Client Management
 * **Feature: workwork-ledger-mvp**
 * **Validates: Requirements 3.5**
 */

import { describe, it } from 'vitest';
import { fc } from '@/test/fc-config';

/**
 * Pure function to filter clients by search query
 * This mirrors the database search logic for testing
 */
interface ClientData {
  id: string;
  name: string;
  email: string;
  active: boolean;
}

function filterClientsBySearch(clients: ClientData[], query: string): ClientData[] {
  if (!query.trim()) {
    return clients.filter((c) => c.active);
  }

  const lowerQuery = query.toLowerCase();
  return clients.filter(
    (c) =>
      c.active &&
      (c.name.toLowerCase().includes(lowerQuery) || c.email.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Check if a client matches a search query
 */
function clientMatchesQuery(client: ClientData, query: string): boolean {
  if (!query.trim()) return true;
  const lowerQuery = query.toLowerCase();
  return (
    client.name.toLowerCase().includes(lowerQuery) ||
    client.email.toLowerCase().includes(lowerQuery)
  );
}

// Arbitrary for client data
const clientDataArb: fc.Arbitrary<ClientData> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  email: fc.emailAddress(),
  active: fc.boolean(),
});

// Arbitrary for search query
const searchQueryArb = fc.string({ minLength: 0, maxLength: 50 });

describe('Client Search', () => {
  /**
   * Property: Search results should only contain matching clients
   * *对于任意*搜索查询，返回的客户应全部满足搜索条件
   * **Validates: Requirements 3.5**
   */
  describe('Search Correctness', () => {
    it('all search results should match the query', () => {
      fc.assert(
        fc.property(
          fc.array(clientDataArb, { minLength: 0, maxLength: 20 }),
          searchQueryArb,
          (clients, query) => {
            const results = filterClientsBySearch(clients, query);

            // All results should match the query
            return results.every((client) => clientMatchesQuery(client, query));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('search results should only contain active clients', () => {
      fc.assert(
        fc.property(
          fc.array(clientDataArb, { minLength: 0, maxLength: 20 }),
          searchQueryArb,
          (clients, query) => {
            const results = filterClientsBySearch(clients, query);

            // All results should be active
            return results.every((client) => client.active === true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('matching active clients should be included in results', () => {
      fc.assert(
        fc.property(
          fc.array(clientDataArb, { minLength: 0, maxLength: 20 }),
          searchQueryArb,
          (clients, query) => {
            const results = filterClientsBySearch(clients, query);
            const resultIds = new Set(results.map((c) => c.id));

            // All active clients that match should be in results
            const matchingActiveClients = clients.filter(
              (c) => c.active && clientMatchesQuery(c, query)
            );

            return matchingActiveClients.every((c) => resultIds.has(c.id));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('empty query should return all active clients', () => {
      fc.assert(
        fc.property(fc.array(clientDataArb, { minLength: 0, maxLength: 20 }), (clients) => {
          const results = filterClientsBySearch(clients, '');
          const activeClients = clients.filter((c) => c.active);

          // Results should equal all active clients
          return results.length === activeClients.length;
        }),
        { numRuns: 100 }
      );
    });

    it('search should be case-insensitive', () => {
      fc.assert(
        fc.property(
          fc.array(clientDataArb, { minLength: 1, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 10 }),
          (clients, query) => {
            const lowerResults = filterClientsBySearch(clients, query.toLowerCase());
            const upperResults = filterClientsBySearch(clients, query.toUpperCase());
            const mixedResults = filterClientsBySearch(clients, query);

            // All case variations should return the same results
            const lowerIds = new Set(lowerResults.map((c) => c.id));
            const upperIds = new Set(upperResults.map((c) => c.id));
            const mixedIds = new Set(mixedResults.map((c) => c.id));

            return (
              lowerIds.size === upperIds.size &&
              lowerIds.size === mixedIds.size &&
              [...lowerIds].every((id) => upperIds.has(id) && mixedIds.has(id))
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('search by exact name should include that client', () => {
      fc.assert(
        fc.property(
          fc.array(clientDataArb, { minLength: 1, maxLength: 20 }).filter((clients) =>
            clients.some((c) => c.active)
          ),
          (clients) => {
            // Pick an active client
            const activeClient = clients.find((c) => c.active);
            if (!activeClient) return true;

            // Search by exact name
            const results = filterClientsBySearch(clients, activeClient.name);

            // The client should be in results
            return results.some((c) => c.id === activeClient.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('search by exact email should include that client', () => {
      fc.assert(
        fc.property(
          fc.array(clientDataArb, { minLength: 1, maxLength: 20 }).filter((clients) =>
            clients.some((c) => c.active)
          ),
          (clients) => {
            // Pick an active client
            const activeClient = clients.find((c) => c.active);
            if (!activeClient) return true;

            // Search by exact email
            const results = filterClientsBySearch(clients, activeClient.email);

            // The client should be in results
            return results.some((c) => c.id === activeClient.id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
