import { prisma } from '@/lib/prisma';
import type { Client, Prisma } from '@prisma/client';

export interface CreateClientInput {
  userId: string;
  name: string;
  email: string;
  company?: string;
  country?: string;
  notes?: string;
}

export interface UpdateClientInput {
  name?: string;
  email?: string;
  company?: string | null;
  country?: string | null;
  notes?: string | null;
}

export interface ClientFilters {
  userId: string;
  search?: string;
  active?: boolean;
}

/**
 * Create a new client
 * _需求: 3.1_
 */
export async function createClient(input: CreateClientInput): Promise<Client> {
  return prisma.client.create({
    data: {
      userId: input.userId,
      name: input.name,
      email: input.email,
      company: input.company,
      country: input.country,
      notes: input.notes,
      active: true,
    },
  });
}

/**
 * Get a client by ID
 */
export async function getClientById(id: string, userId: string): Promise<Client | null> {
  return prisma.client.findFirst({
    where: {
      id,
      userId,
    },
  });
}

/**
 * Update a client
 * _需求: 3.3_
 */
export async function updateClient(
  id: string,
  userId: string,
  input: UpdateClientInput
): Promise<Client | null> {
  const client = await getClientById(id, userId);
  if (!client) return null;

  return prisma.client.update({
    where: { id },
    data: input,
  });
}

/**
 * Soft delete a client (mark as inactive)
 * _需求: 3.4_
 */
export async function deleteClient(id: string, userId: string): Promise<Client | null> {
  const client = await getClientById(id, userId);
  if (!client) return null;

  return prisma.client.update({
    where: { id },
    data: { active: false },
  });
}

/**
 * List clients with optional filters
 * _需求: 3.2_
 */
export async function listClients(filters: ClientFilters): Promise<Client[]> {
  const where: Prisma.ClientWhereInput = {
    userId: filters.userId,
  };

  if (filters.active !== undefined) {
    where.active = filters.active;
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  return prisma.client.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Search clients by name or email
 * _需求: 3.5_
 */
export async function searchClients(
  userId: string,
  query: string
): Promise<Client[]> {
  if (!query.trim()) {
    return listClients({ userId, active: true });
  }

  return prisma.client.findMany({
    where: {
      userId,
      active: true,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: { name: 'asc' },
  });
}

/**
 * Check if a client belongs to a user
 */
export async function clientBelongsToUser(clientId: string, userId: string): Promise<boolean> {
  const client = await prisma.client.findFirst({
    where: { id: clientId, userId },
    select: { id: true },
  });
  return client !== null;
}
