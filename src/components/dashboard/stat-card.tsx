'use client';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'emerald' | 'cyan' | 'purple' | 'yellow' | 'blue';
}

const colorClasses = {
  emerald: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    value: 'text-emerald-500',
  },
  cyan: {
    bg: 'bg-cyan-500/20',
    text: 'text-cyan-400',
    value: 'text-cyan-500',
  },
  purple: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    value: 'text-purple-500',
  },
  yellow: {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
    value: 'text-yellow-500',
  },
  blue: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    value: 'text-blue-500',
  },
};

export function StatCard({ title, value, subtitle, icon, trend, color = 'emerald' }: StatCardProps) {
  const colors = colorClasses[color];

  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${colors.value}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span className="ml-1">{Math.abs(trend.value).toFixed(1)}%</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center`}>
            <div className={colors.text}>{icon}</div>
          </div>
        )}
      </div>
    </div>
  );
}
