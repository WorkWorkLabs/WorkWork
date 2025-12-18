/**
 * Dashboard Module Exports
 */

export {
  // Types
  type TimePeriod,
  type AggregationPeriod,
  type DashboardFilters,
  type ClientRanking,
  type PaymentMethodDistribution,
  type PeriodAggregation,
  type DashboardStats,
  // Pure functions (for testing)
  calculateTotalIncome,
  aggregateByPeriod,
  calculateClientRankings,
  calculatePaymentMethodDistribution,
  calculateTaxReserve,
  getDateRangeForPeriod,
  // Database functions
  getDashboardStats,
  getIncomeTrend,
  getTopClients,
  getPaymentMethodStats,
} from './dashboard.service';
