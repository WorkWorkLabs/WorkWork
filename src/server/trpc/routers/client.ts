import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import {
  createClient,
  getClientById,
  updateClient,
  deleteClient,
  listClients,
  searchClients,
} from '@/server/client';

// Input validation schemas
const createClientSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  company: z.string().max(100).optional(),
  country: z.string().max(2).optional(),
  notes: z.string().max(500).optional(),
});

const updateClientSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  company: z.string().max(100).optional().nullable(),
  country: z.string().max(2).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

const listClientsSchema = z.object({
  userId: z.string().min(1),
  search: z.string().optional(),
  active: z.boolean().optional(),
});

const searchClientsSchema = z.object({
  userId: z.string().min(1),
  query: z.string(),
});

export const clientRouter = router({
  /**
   * Create a new client
   * _需求: 3.1_
   */
  create: publicProcedure.input(createClientSchema).mutation(async ({ input }) => {
    return createClient(input);
  }),

  /**
   * Get a client by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.string(), userId: z.string() }))
    .query(async ({ input }) => {
      return getClientById(input.id, input.userId);
    }),

  /**
   * Update a client
   * _需求: 3.3_
   */
  update: publicProcedure.input(updateClientSchema).mutation(async ({ input }) => {
    const { id, userId, ...data } = input;
    return updateClient(id, userId, data);
  }),

  /**
   * Soft delete a client
   * _需求: 3.4_
   */
  delete: publicProcedure
    .input(z.object({ id: z.string(), userId: z.string() }))
    .mutation(async ({ input }) => {
      return deleteClient(input.id, input.userId);
    }),

  /**
   * List clients with filters
   * _需求: 3.2_
   */
  list: publicProcedure.input(listClientsSchema).query(async ({ input }) => {
    return listClients(input);
  }),

  /**
   * Search clients by name or email
   * _需求: 3.5_
   */
  search: publicProcedure.input(searchClientsSchema).query(async ({ input }) => {
    return searchClients(input.userId, input.query);
  }),
});
