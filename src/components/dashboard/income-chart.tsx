'use client';

interface PeriodData {
  period: string;
  amount: string;
}

interface IncomeChartProps {
  data: PeriodData[];
  isLoading?: boolean;
}

export function IncomeChart({ data, isLoading }: IncomeChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">收入趋势</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">加载中...</div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">收入趋势</h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-400">暂无数据</p>
        </div>
      </div>
    );
  }

  // Find max value for scaling
  const maxAmount = Math.max(...data.map((d) => parseFloat(d.amount)));
  const scale = maxAmount > 0 ? 200 / maxAmount : 1;

  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
      <h3 className="text-lg font-semibold text-white mb-4">收入趋势</h3>
      <div className="h-64 flex items-end gap-2 px-4">
        {data.map((item, index) => {
          const height = Math.max(parseFloat(item.amount) * scale, 4);
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div
                className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg transition-all hover:from-emerald-500 hover:to-emerald-300"
                style={{ height: `${height}px` }}
                title={`$${parseFloat(item.amount).toFixed(2)}`}
              />
              <span className="text-xs text-gray-400 truncate max-w-full">
                {formatPeriodLabel(item.period)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatPeriodLabel(period: string): string {
  // Handle month format: 2024-01
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [year, month] = period.split('-');
    return `${month}月`;
  }
  // Handle week format: 2024-W01
  if (/^\d{4}-W\d{2}$/.test(period)) {
    const week = period.split('-W')[1];
    return `W${week}`;
  }
  return period;
}
