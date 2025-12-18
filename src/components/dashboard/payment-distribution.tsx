'use client';

type PaymentMethod = 'card' | 'bank_transfer' | 'crypto_usdc' | 'crypto_usdt';

interface PaymentMethodDistribution {
  method: PaymentMethod;
  amount: string;
  percentage: number;
}

interface PaymentDistributionProps {
  distribution: PaymentMethodDistribution[];
  isLoading?: boolean;
}

const methodLabels: Record<PaymentMethod, string> = {
  card: '信用卡',
  bank_transfer: '银行转账',
  crypto_usdc: 'USDC',
  crypto_usdt: 'USDT',
};

const methodColors: Record<PaymentMethod, string> = {
  card: 'bg-blue-500',
  bank_transfer: 'bg-purple-500',
  crypto_usdc: 'bg-emerald-500',
  crypto_usdt: 'bg-cyan-500',
};

export function PaymentDistribution({ distribution, isLoading }: PaymentDistributionProps) {
  if (isLoading) {
    return (
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">支付方式分布</h3>
        <div className="animate-pulse">
          <div className="h-32 bg-white/10 rounded-full w-32 mx-auto mb-4" />
          <div className="space-y-2">
            <div className="h-4 bg-white/10 rounded w-3/4 mx-auto" />
            <div className="h-4 bg-white/10 rounded w-1/2 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (distribution.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">支付方式分布</h3>
        <p className="text-gray-400 text-center py-8">暂无数据</p>
      </div>
    );
  }

  // Calculate fiat vs crypto totals
  const fiatMethods: PaymentMethod[] = ['card', 'bank_transfer'];
  const cryptoMethods: PaymentMethod[] = ['crypto_usdc', 'crypto_usdt'];

  const fiatTotal = distribution
    .filter((d) => fiatMethods.includes(d.method))
    .reduce((sum, d) => sum + parseFloat(d.amount), 0);

  const cryptoTotal = distribution
    .filter((d) => cryptoMethods.includes(d.method))
    .reduce((sum, d) => sum + parseFloat(d.amount), 0);

  const total = fiatTotal + cryptoTotal;
  const fiatPercentage = total > 0 ? (fiatTotal / total) * 100 : 0;
  const cryptoPercentage = total > 0 ? (cryptoTotal / total) * 100 : 0;

  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
      <h3 className="text-lg font-semibold text-white mb-4">支付方式分布</h3>
      
      {/* Fiat vs Crypto Summary */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 bg-white/5 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">法币</p>
          <p className="text-lg font-bold text-blue-400">${fiatTotal.toLocaleString()}</p>
          <p className="text-xs text-gray-500">{fiatPercentage.toFixed(1)}%</p>
        </div>
        <div className="flex-1 bg-white/5 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">稳定币</p>
          <p className="text-lg font-bold text-emerald-400">${cryptoTotal.toLocaleString()}</p>
          <p className="text-xs text-gray-500">{cryptoPercentage.toFixed(1)}%</p>
        </div>
      </div>

      {/* Detailed breakdown */}
      <div className="space-y-3">
        {distribution.map((item) => (
          <div key={item.method} className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${methodColors[item.method]}`} />
            <span className="text-sm text-gray-300 flex-1">{methodLabels[item.method]}</span>
            <span className="text-sm text-gray-400">
              ${parseFloat(item.amount).toLocaleString()}
            </span>
            <span className="text-xs text-gray-500 w-12 text-right">
              {item.percentage.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
