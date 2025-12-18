/**
 * Dashboard Service
 * Implements requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import { prisma } from '@/lib/prisma';
import type { Currency, PaymentMethod } from '@prisma/client';
import Decimal from 'decimal.js';

// ============================================
// Types
// ============================================

export type TimePeriod = 'this_month' | 'this_quarter' | 'this_year' | 'custom';
export type AggregationPeriod = 'week' | 'month';

export interface DashboardFilters {
  userId: string;
  period: TimePeriod;
  startDate?: Date;
  endDate?: Date;
}

export interface ClientRanking {
  clientId: string;
  clientName: string;
  amount: Decimal;
  percentage: number;
}

export interface PaymentMethodDistribution {
  method: PaymentMethod;
  amount: Decimal;
  percentage: number;
}

export interface PeriodAggregation {
  period: string;
  amount: Decimal;
}

export interface DashboardStats {
  totalIncome: Decimal;
  totalIncomeInDefaultCurrency: Decimal;
  topClients: ClientRanking[];
  paymentMethodDistribution: PaymentMethodDistribution[];
  periodAggregations: PeriodAggregation[];
  suggestedTaxReserve: Decimal | null;
}

// ============================================
// Date Range Helpers
// ============================================

/**
 * Get date range based on time period
 * _需求: 9.2_
 */
export function getDateRangeForPeriod(
  period: TimePeriod,
  customStartDate?: Date,
  customEndDate?: Date
): { startDate: Date; endDate: Date } {
  const now = new Date();
  
  switch (period) {
    case 'this_month': {
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { startDate, endDate };
    }
    case 'this_quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      const startDate = new Date(now.getFullYear(), quarter * 3, 1);
      const endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
      return { startDate, endDate };
    }
    case 'this_year': {
      const startDate = new Date(now.getFullYear(), 0, 1);
      const endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { startDate, endDate };
    }
    case 'custom': {
      if (!customStartDate || !customEndDate) {
        throw new Error('Custom period requires startDate and endDate');
      }
      return { startDate: customStartDate, endDate: customEndDate };
    }
  }
}

// ============================================
// Pure Calculation Functions (for testing)
// ============================================

/**
 * Calculate total income from ledger entries
 * Pure function for Property 20 testing
 * _需求: 9.1_
 */
export function calculateTotalIncome(
  entries: Array<{ amountInDefaultCurrency: Decimal | string }>
): Decimal {
  return entries.reduce((sum, entry) => {
    const amount = typeof entry.amountInDefaultCurrency === 'string'
      ? new Decimal(entry.amountInDefaultCurrency)
      : entry.amountInDefaultCurrency;
    return sum.add(amount);
  }, new Decimal(0));
}

/**
 * Aggregate entries by time period
 * Pure function for Property 21 testing
 * _需求: 9.3_
 */
export function aggregateByPeriod(
  entries: Array<{ entryDate: Date; amountInDefaultCurrency: Decimal | string }>,
  aggregationPeriod: AggregationPeriod
): PeriodAggregation[] {
  const aggregations = new Map<string, Decimal>();
  
  for (const entry of entries) {
    const periodKey = getPeriodKey(entry.entryDate, aggregationPeriod);
    const amount = typeof entry.amountInDefaultCurrency === 'string'
      ? new Decimal(entry.amountInDefaultCurrency)
      : entry.amountInDefaultCurrency;
    
    const current = aggregations.get(periodKey) || new Decimal(0);
    aggregations.set(periodKey, current.add(amount));
  }
  
  // Sort by period key and return
  return Array.from(aggregations.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, amount]) => ({ period, amount }));
}

/**
 * Get period key for a date
 */
function getPeriodKey(date: Date, aggregationPeriod: AggregationPeriod): string {
  const year = date.getFullYear();
  
  if (aggregationPeriod === 'month') {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  } else {
    // Week: use ISO week number
    const weekNumber = getISOWeekNumber(date);
    return `${year}-W${String(weekNumber).padStart(2, '0')}`;
  }
}

/**
 * Get ISO week number for a date
 */
function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Calculate client rankings
 * Pure function for Property 22 testing
 * _需求: 9.4_
 */
export function calculateClientRankings(
  entries: Array<{ clientId: string; clientName: string; amountInDefaultCurrency: Decimal | string }>,
  topN: number = 5
): ClientRanking[] {
  // Aggregate by client
  const clientTotals = new Map<string, { name: string; amount: Decimal }>();
  
  for (const entry of entries) {
    const amount = typeof entry.amountInDefaultCurrency === 'string'
      ? new Decimal(entry.amountInDefaultCurrency)
      : entry.amountInDefaultCurrency;
    
    const current = clientTotals.get(entry.clientId);
    if (current) {
      current.amount = current.amount.add(amount);
    } else {
      clientTotals.set(entry.clientId, { name: entry.clientName, amount });
    }
  }
  
  // Calculate total for percentage
  const totalIncome = Array.from(clientTotals.values())
    .reduce((sum, { amount }) => sum.add(amount), new Decimal(0));
  
  // Sort by amount descending and take top N
  const sorted = Array.from(clientTotals.entries())
    .sort(([, a], [, b]) => b.amount.minus(a.amount).toNumber())
    .slice(0, topN);
  
  // Calculate percentages
  return sorted.map(([clientId, { name, amount }]) => ({
    clientId,
    clientName: name,
    amount,
    percentage: totalIncome.isZero() ? 0 : amount.div(totalIncome).mul(100).toNumber(),
  }));
}

/**
 * Calculate payment method distribution
 * Pure function for Property 23 testing
 * _需求: 9.5_
 */
export function calculatePaymentMethodDistribution(
  entries: Array<{ paymentMethod: PaymentMethod; amountInDefaultCurrency: Decimal | string }>
): PaymentMethodDistribution[] {
  // Aggregate by payment method
  const methodTotals = new Map<PaymentMethod, Decimal>();
  
  for (const entry of entries) {
    const amount = typeof entry.amountInDefaultCurrency === 'string'
      ? new Decimal(entry.amountInDefaultCurrency)
      : entry.amountInDefaultCurrency;
    
    const current = methodTotals.get(entry.paymentMethod) || new Decimal(0);
    methodTotals.set(entry.paymentMethod, current.add(amount));
  }
  
  // Calculate total for percentage
  const totalIncome = Array.from(methodTotals.values())
    .reduce((sum, amount) => sum.add(amount), new Decimal(0));
  
  // Convert to array with percentages
  return Array.from(methodTotals.entries())
    .map(([method, amount]) => ({
      method,
      amount,
      percentage: totalIncome.isZero() ? 0 : amount.div(totalIncome).mul(100).toNumber(),
    }))
    .sort((a, b) => b.amount.minus(a.amount).toNumber());
}

/**
 * Calculate suggested tax reserve
 * Pure function for Property 24 testing
 * _需求: 9.6_
 */
export function calculateTaxReserve(
  totalIncome: Decimal,
  taxRate: Decimal
): Decimal {
  return totalIncome.mul(taxRate);
}


// ============================================
// Database Query Functions
// ============================================

/**
 * Get dashboard statistics
 * _需求: 9.1, 9.2_
 */
export async function getDashboardStats(
  filters: DashboardFilters,
  aggregationPeriod: AggregationPeriod = 'month'
): Promise<DashboardStats> {
  const { startDate, endDate } = getDateRangeForPeriod(
    filters.period,
    filters.startDate,
    filters.endDate
  );

  // Fetch ledger entries with client info
  const entries = await prisma.ledgerEntry.findMany({
    where: {
      userId: filters.userId,
      entryDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      client: {
        select: { name: true },
      },
    },
  });

  // Get user settings for tax rate
  const userSettings = await prisma.userSettings.findUnique({
    where: { userId: filters.userId },
    select: { estimatedTaxRate: true },
  });

  // Transform entries for calculations
  const entriesWithClientName = entries.map(entry => ({
    ...entry,
    clientName: entry.client.name,
    amountInDefaultCurrency: new Decimal(entry.amountInDefaultCurrency.toString()),
  }));

  // Calculate statistics using pure functions
  const totalIncomeInDefaultCurrency = calculateTotalIncome(entriesWithClientName);
  
  // Calculate total in original currencies (sum of amounts)
  const totalIncome = entries.reduce(
    (sum, entry) => sum.add(new Decimal(entry.amount.toString())),
    new Decimal(0)
  );

  const topClients = calculateClientRankings(entriesWithClientName, 5);
  const paymentMethodDistribution = calculatePaymentMethodDistribution(entriesWithClientName);
  const periodAggregations = aggregateByPeriod(entriesWithClientName, aggregationPeriod);

  // Calculate tax reserve if tax rate is configured
  let suggestedTaxReserve: Decimal | null = null;
  if (userSettings?.estimatedTaxRate) {
    const taxRate = new Decimal(userSettings.estimatedTaxRate.toString());
    if (taxRate.greaterThan(0)) {
      suggestedTaxReserve = calculateTaxReserve(totalIncomeInDefaultCurrency, taxRate);
    }
  }

  return {
    totalIncome,
    totalIncomeInDefaultCurrency,
    topClients,
    paymentMethodDistribution,
    periodAggregations,
    suggestedTaxReserve,
  };
}

/**
 * Get income trend data
 * _需求: 9.3_
 */
export async function getIncomeTrend(
  userId: string,
  startDate: Date,
  endDate: Date,
  aggregationPeriod: AggregationPeriod = 'month'
): Promise<PeriodAggregation[]> {
  const entries = await prisma.ledgerEntry.findMany({
    where: {
      userId,
      entryDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      entryDate: true,
      amountInDefaultCurrency: true,
    },
  });

  const entriesWithDecimal = entries.map(entry => ({
    entryDate: entry.entryDate,
    amountInDefaultCurrency: new Decimal(entry.amountInDefaultCurrency.toString()),
  }));

  return aggregateByPeriod(entriesWithDecimal, aggregationPeriod);
}

/**
 * Get top clients for a period
 * _需求: 9.4_
 */
export async function getTopClients(
  userId: string,
  startDate: Date,
  endDate: Date,
  topN: number = 5
): Promise<ClientRanking[]> {
  const entries = await prisma.ledgerEntry.findMany({
    where: {
      userId,
      entryDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      client: {
        select: { name: true },
      },
    },
  });

  const entriesWithClientName = entries.map(entry => ({
    clientId: entry.clientId,
    clientName: entry.client.name,
    amountInDefaultCurrency: new Decimal(entry.amountInDefaultCurrency.toString()),
  }));

  return calculateClientRankings(entriesWithClientName, topN);
}

/**
 * Get payment method distribution for a period
 * _需求: 9.5_
 */
export async function getPaymentMethodStats(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<PaymentMethodDistribution[]> {
  const entries = await prisma.ledgerEntry.findMany({
    where: {
      userId,
      entryDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      paymentMethod: true,
      amountInDefaultCurrency: true,
    },
  });

  const entriesWithDecimal = entries.map(entry => ({
    paymentMethod: entry.paymentMethod,
    amountInDefaultCurrency: new Decimal(entry.amountInDefaultCurrency.toString()),
  }));

  return calculatePaymentMethodDistribution(entriesWithDecimal);
}
