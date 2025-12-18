'use client';

interface ClientRanking {
  clientId: string;
  clientName: string;
  amount: string;
  percentage: number;
}

interface TopClientsProps {
  clients: ClientRanking[];
  isLoading?: boolean;
}

export function TopClients({ clients, isLoading }: TopClientsProps) {
  if (isLoading) {
    return (
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Top 客户</h3>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
              <div className="h-2 bg-white/5 rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Top 客户</h3>
        <p className="text-gray-400 text-center py-8">暂无数据</p>
      </div>
    );
  }

  const colors = [
    'from-emerald-500 to-emerald-400',
    'from-cyan-500 to-cyan-400',
    'from-purple-500 to-purple-400',
    'from-yellow-500 to-yellow-400',
    'from-blue-500 to-blue-400',
  ];

  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
      <h3 className="text-lg font-semibold text-white mb-4">Top 客户</h3>
      <div className="space-y-4">
        {clients.map((client, index) => (
          <div key={client.clientId}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-300 truncate max-w-[60%]">
                {client.clientName}
              </span>
              <span className="text-sm text-gray-400">
                ${parseFloat(client.amount).toLocaleString()} ({client.percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${colors[index % colors.length]} rounded-full transition-all`}
                style={{ width: `${client.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
