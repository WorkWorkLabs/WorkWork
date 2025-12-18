'use client';

import { useState } from 'react';

export type TimePeriod = 'this_month' | 'this_quarter' | 'this_year' | 'custom';

interface TimePeriodSelectorProps {
  value: TimePeriod;
  onChange: (period: TimePeriod) => void;
  customStartDate?: string;
  customEndDate?: string;
  onCustomStartDateChange?: (date: string) => void;
  onCustomEndDateChange?: (date: string) => void;
}

const periodLabels: Record<TimePeriod, string> = {
  this_month: '本月',
  this_quarter: '本季度',
  this_year: '今年',
  custom: '自定义',
};

export function TimePeriodSelector({
  value,
  onChange,
  customStartDate,
  customEndDate,
  onCustomStartDateChange,
  onCustomEndDateChange,
}: TimePeriodSelectorProps) {
  const [showCustom, setShowCustom] = useState(value === 'custom');

  const handlePeriodChange = (period: TimePeriod) => {
    onChange(period);
    setShowCustom(period === 'custom');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(periodLabels) as TimePeriod[]).map((period) => (
          <button
            key={period}
            onClick={() => handlePeriodChange(period)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              value === period
                ? 'bg-emerald-600 text-white'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
            }`}
          >
            {periodLabels[period]}
          </button>
        ))}
      </div>

      {showCustom && (
        <div className="flex gap-4 items-center">
          <div>
            <label className="block text-xs text-gray-400 mb-1">开始日期</label>
            <input
              type="date"
              value={customStartDate || ''}
              onChange={(e) => onCustomStartDateChange?.(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">结束日期</label>
            <input
              type="date"
              value={customEndDate || ''}
              onChange={(e) => onCustomEndDateChange?.(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}
