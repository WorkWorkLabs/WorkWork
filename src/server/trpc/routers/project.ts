import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import {
  createProject,
  getProjectById,
  updateProject,
  archiveProject,
  unarchiveProject,
  listProjects,
} from '@/server/project';

// Input validation schemas
const createProjectSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

const updateProjectSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
});

export const projectRouter = router({
  /**
   * Create a new project
   * _需求: 4.1_
   */
  create: publicProcedure.input(createProjectSchema).mutation(async ({ input }) => {
    return createProject(input);
  }),

  /**
   * Get a project by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.string(), userId: z.string() }))
    .query(async ({ input }) => {
      return getProjectById(input.id, input.userId);
    }),

  /**
   * Update a project
   */
  update: publicProcedure.input(updateProjectSchema).mutation(async ({ input }) => {
    const { id, userId, ...data } = input;
    return updateProject(id, userId, data);
  }),

  /**
   * Archive a project
   * _需求: 4.4_
   */
  archive: publicProcedure
    .input(z.object({ id: z.string(), userId: z.string() }))
    .mutation(async ({ input }) => {
      return archiveProject(input.id, input.userId);
    }),

  /**
   * Unarchive a project
   */
  unarchive: publicProcedure
    .input(z.object({ id: z.string(), userId: z.string() }))
    .mutation(async ({ input }) => {
      return unarchiveProject(input.id, input.userId);
    }),

  /**
   * List projects
   * _需求: 4.2_
   */
  list: publicProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        includeArchived: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      return listProjects(input.userId, input.includeArchived);
    }),
});
