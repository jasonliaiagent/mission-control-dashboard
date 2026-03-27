'use client';

import { useEffect, useState } from 'react';

interface ComparisonStats {
  v2: {
    trades: number;
    wins: number;
    losses: number;
    win_rate: number;
    total_pnl: number;
  };
  v3: {
    trades: number;
    wins: number;
    losses: number;
    win_rate: number;
    total_pnl: number;
  };
  last_updated: string;
}

interface Trade {
  id: number;
  timestamp: string;
  coin: string;
  direction: string;
  entry: number;
  exit: number;
  pnl: number;
  exit_reason: string;
  version: string;
  partial_tp?: boolean;
}

export default function V3TestPage() {
  const [stats, setStats] = useState<ComparisonStats | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);

  const loadData = async () => {
    try {
      const [comparisonRes, tradesRes] = await Promise.all([
        fetch('/data/paper_comparison.json'),
        fetch('/data/paper_trades.json')
      ]);

      if (comparisonRes.ok && tradesRes.ok) {
        setStats(await comparisonRes.json());
        setTrades(await tradesRes.json());
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-500 to-violet-500 bg-clip-text text-transparent mb-2">
            📊 Paper Trading V3 Test
          </h1>
          <p className="text-gray-400 text-sm">
            Stochastic Oscillator: V2 vs V3 Comparison
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* V2 Stats */}
          <StatCard
            title="V2 Performance (Mar 20-27)"
            stats={stats.v2}
            version="v2"
            color="gray"
          />

          {/* V3 Stats */}
          <StatCard
            title="V3 Performance (Mar 27-Apr 1)"
            stats={stats.v3}
            version="v3"
            color="purple"
          />
        </div>

        {/* Trade History */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-300">
            Trade History
          </h2>
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-800 text-gray-400 text-xs uppercase">
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">Version</th>
                  <th className="px-4 py-3 text-left">Side</th>
                  <th className="px-4 py-3 text-right">Entry</th>
                  <th className="px-4 py-3 text-right">Exit</th>
                  <th className="px-4 py-3 text-right">P/L</th>
                  <th className="px-4 py-3 text-left">Reason</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr
                    key={trade.id}
                    className="border-b border-gray-800 hover:bg-gray-800/50"
                  >
                    <td className="px-4 py-3 text-sm">
                      {new Date(trade.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          trade.version === 'v3'
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {trade.version.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 rounded text-xs font-semibold ${
                          trade.direction === 'LONG'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {trade.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      ${trade.entry.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      ${trade.exit.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-semibold ${
                          trade.pnl > 0
                            ? 'text-green-400'
                            : trade.pnl < 0
                            ? 'text-red-400'
                            : 'text-gray-400'
                        }`}
                      >
                        ${trade.pnl.toFixed(2)}
                      </span>
                      {trade.partial_tp && (
                        <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                          PARTIAL
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {trade.exit_reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-center text-gray-500 text-xs mt-6">
          Last updated: {new Date(stats.last_updated).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  stats,
  version,
  color,
}: {
  title: string;
  stats: ComparisonStats['v2'];
  version: string;
  color: string;
}) {
  const winRateClass =
    stats.win_rate >= 60
      ? 'text-green-400'
      : stats.win_rate >= 50
      ? 'text-yellow-400'
      : 'text-red-400';

  const pnlClass =
    stats.total_pnl > 0
      ? 'text-green-400'
      : stats.total_pnl < 0
      ? 'text-red-400'
      : 'text-gray-400';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-300">{title}</h2>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            color === 'purple'
              ? 'bg-purple-500/20 text-purple-300'
              : 'bg-gray-700 text-gray-400'
          }`}
        >
          {version.toUpperCase()}
        </span>
      </div>

      <div className="space-y-3">
        <StatRow label="Total Trades" value={stats.trades.toString()} />
        <StatRow
          label="Win Rate"
          value={`${stats.win_rate}%`}
          valueClass={winRateClass}
        />
        <StatRow
          label="Wins / Losses"
          value={`${stats.wins}W / ${stats.losses}L`}
        />
        <StatRow
          label="Total P/L"
          value={`$${stats.total_pnl.toFixed(2)}`}
          valueClass={pnlClass}
        />
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  valueClass = 'text-white',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={`text-sm font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}
