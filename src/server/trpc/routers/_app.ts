import { router } from '../trpc';
import { authRouter } from './auth';
import { clientRouter } from './client';
import { projectRouter } from './project';
import { invoiceRouter } from './invoice';

/**
 * Main app router - combine all sub-routers here
 */
export const appRouter = router({
  auth: authRouter,
  client: clientRouter,
  project: projectRouter,
  invoice: invoiceRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;
