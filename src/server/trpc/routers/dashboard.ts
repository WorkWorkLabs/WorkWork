/**
 * Dashboard tRPC Router
 * Implements requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import {
  getDashboardStats,
  getIncomeTrend,
  getTopClients,
  getPaymentMethodStats,
  getDateRangeForPeriod,
  type TimePeriod,
  type AggregationPeriod,
} from '@/server/dashboard';

// Input validation schemas
const timePeriodSchema = z.enum(['this_month', 'this_quarter', 'this_year', 'custom']);
const aggregationPeriodSchema = z.enum(['week', 'month']);

const dashboardStatsSchema = z.object({
  userId: z.string().min(1),
  period: timePeriodSchema,
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  aggregationPeriod: aggregationPeriodSchema.default('month'),
});

const incomeTrendSchema = z.object({
  userId: z.string().min(1),
  startDate: z.date(),
  endDate: z.date(),
  aggregationPeriod: aggregationPeriodSchema.default('month'),
});

const topClientsSchema = z.object({
  userId: z.string().min(1),
  startDate: z.date(),
  endDate: z.date(),
  topN: z.number().int().positive().max(20).default(5),
});

const paymentMethodStatsSchema = z.object({
  userId: z.string().min(1),
  startDate: z.date(),
  endDate: z.date(),
});

export const dashboardRouter = router({
  /**
   * Get dashboard statistics
   * _需求: 9.1, 9.2_
   */
  getStats: publicProcedure.input(dashboardStatsSchema).query(async ({ input }) => {
    const stats = await getDashboardStats(
      {
        userId: input.userId,
        period: input.period as TimePeriod,
        startDate: input.startDate,
        endDate: input.endDate,
      },
      input.aggregationPeriod as AggregationPeriod
    );

    // Convert Decimal to string for JSON serialization
    return {
      totalIncome: stats.totalIncome.toString(),
      totalIncomeInDefaultCurrency: stats.totalIncomeInDefaultCurrency.toString(),
      topClients: stats.topClients.map(client => ({
        ...client,
        amount: client.amount.toString(),
      })),
      paymentMethodDistribution: stats.paymentMethodDistribution.map(dist => ({
        ...dist,
        amount: dist.amount.toString(),
      })),
      periodAggregations: stats.periodAggregations.map(agg => ({
        ...agg,
        amount: agg.amount.toString(),
      })),
      suggestedTaxReserve: stats.suggestedTaxReserve?.toString() ?? null,
    };
  }),

  /**
   * Get income trend data
   * _需求: 9.3_
   */
  getIncomeTrend: publicProcedure.input(incomeTrendSchema).query(async ({ input }) => {
    const trend = await getIncomeTrend(
      input.userId,
      input.startDate,
      input.endDate,
      input.aggregationPeriod as AggregationPeriod
    );

    return trend.map(agg => ({
      ...agg,
      amount: agg.amount.toString(),
    }));
  }),

  /**
   * Get top clients
   * _需求: 9.4_
   */
  getTopClients: publicProcedure.input(topClientsSchema).query(async ({ input }) => {
    const clients = await getTopClients(
      input.userId,
      input.startDate,
      input.endDate,
      input.topN
    );

    return clients.map(client => ({
      ...client,
      amount: client.amount.toString(),
    }));
  }),

  /**
   * Get payment method distribution
   * _需求: 9.5_
   */
  getPaymentMethodStats: publicProcedure.input(paymentMethodStatsSchema).query(async ({ input }) => {
    const stats = await getPaymentMethodStats(
      input.userId,
      input.startDate,
      input.endDate
    );

    return stats.map(dist => ({
      ...dist,
      amount: dist.amount.toString(),
    }));
  }),

  /**
   * Get date range for a time period
   * Helper endpoint for frontend
   */
  getDateRange: publicProcedure
    .input(z.object({
      period: timePeriodSchema,
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(({ input }) => {
      return getDateRangeForPeriod(
        input.period as TimePeriod,
        input.startDate,
        input.endDate
      );
    }),
});
