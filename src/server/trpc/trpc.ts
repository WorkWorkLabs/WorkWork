import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';

/**
 * Context type for tRPC procedures
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Context {
  // Add session, user, etc. here later
}

/**
 * Create context for each request
 */
export const createContext = async (): Promise<Context> => {
  return {};
};

/**
 * Initialize tRPC with superjson transformer for proper serialization
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Export reusable router and procedure helpers
 */
export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
