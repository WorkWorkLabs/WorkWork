import { prisma } from '@/lib/prisma';
import type { Project } from '@prisma/client';

export interface CreateProjectInput {
  userId: string;
  name: string;
  description?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
}

/**
 * Create a new project
 * _需求: 4.1_
 */
export async function createProject(input: CreateProjectInput): Promise<Project> {
  return prisma.project.create({
    data: {
      userId: input.userId,
      name: input.name,
      description: input.description,
      archived: false,
    },
  });
}

/**
 * Get a project by ID
 */
export async function getProjectById(id: string, userId: string): Promise<Project | null> {
  return prisma.project.findFirst({
    where: {
      id,
      userId,
    },
  });
}

/**
 * Update a project
 */
export async function updateProject(
  id: string,
  userId: string,
  input: UpdateProjectInput
): Promise<Project | null> {
  const project = await getProjectById(id, userId);
  if (!project) return null;

  return prisma.project.update({
    where: { id },
    data: input,
  });
}

/**
 * Archive a project (soft delete)
 * _需求: 4.4_
 */
export async function archiveProject(id: string, userId: string): Promise<Project | null> {
  const project = await getProjectById(id, userId);
  if (!project) return null;

  return prisma.project.update({
    where: { id },
    data: { archived: true },
  });
}

/**
 * Unarchive a project
 */
export async function unarchiveProject(id: string, userId: string): Promise<Project | null> {
  const project = await getProjectById(id, userId);
  if (!project) return null;

  return prisma.project.update({
    where: { id },
    data: { archived: false },
  });
}

/**
 * List projects for a user
 * _需求: 4.2_
 */
export async function listProjects(
  userId: string,
  includeArchived: boolean = false
): Promise<Project[]> {
  return prisma.project.findMany({
    where: {
      userId,
      ...(includeArchived ? {} : { archived: false }),
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Check if a project belongs to a user
 */
export async function projectBelongsToUser(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });
  return project !== null;
}
