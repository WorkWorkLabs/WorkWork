import { router } from '../trpc';
import { authRouter } from './auth';
import { clientRouter } from './client';
import { projectRouter } from './project';
import { invoiceRouter } from './invoice';

/**
 * Main app router - combine all sub-routers here
 * Note: 'clients' is used instead of 'client' to avoid collision with tRPC built-in method
 */
export const appRouter = router({
  auth: authRouter,
  clients: clientRouter,
  project: projectRouter,
  invoice: invoiceRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;
