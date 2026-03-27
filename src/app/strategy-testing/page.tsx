'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://lwylhzhusaeotezdbdca.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3eWxoemh1c2Flb3RlemRiZGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NzE2MDEsImV4cCI6MjA4ODQ0NzYwMX0.V0RFtWNTA6RNmqu5lmK541S7LTYxm76TVjpZJ7lFRuE'
);

// Paper Trading Component
function PaperTradingSection() {
  const [paperStats, setPaperStats] = useState<any[]>([]);
  const [paperTrades, setPaperTrades] = useState<any[]>([]);
  const [btcPrice, setBtcPrice] = useState<number>(0);

  useEffect(() => {
    // Fetch paper stats
    const fetchPaperStats = async () => {
      const { data } = await supabase
        .from('paper_stats')
        .select('*')
        .order('strategy');
      if (data) setPaperStats(data);
    };

    // Fetch paper trades
    const fetchPaperTrades = async () => {
      const { data } = await supabase
        .from('paper_trades')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(20);
      if (data) setPaperTrades(data);
    };

    // Fetch BTC price
    const fetchBtcPrice = async () => {
      try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
        const data = await res.json();
        setBtcPrice(parseFloat(data.price));
      } catch (err) {
        console.error('Failed to fetch BTC price:', err);
      }
    };

    fetchPaperStats();
    fetchPaperTrades();
    fetchBtcPrice();

    // Real-time subscriptions
    const statsChannel = supabase
      .channel('paper_stats_sub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'paper_stats' }, fetchPaperStats)
      .subscribe();

    const tradesChannel = supabase
      .channel('paper_trades_sub')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'paper_trades' }, fetchPaperTrades)
      .subscribe();

    const priceInterval = setInterval(fetchBtcPrice, 5000);

    return () => {
      supabase.removeChannel(statsChannel);
      supabase.removeChannel(tradesChannel);
      clearInterval(priceInterval);
    };
  }, []);

  const totalCapital = paperStats.reduce((sum, s) => sum + Number(s.capital || 0), 0);
  const totalPnL = paperStats.reduce((sum, s) => sum + Number(s.total_pnl || 0), 0);
  const totalTrades = paperStats.reduce((sum, s) => sum + (s.total_trades || 0), 0);

  const getStrategyColor = (strategy: string) => {
    switch (strategy) {
      case 'regime': return 'from-blue-500 to-blue-600';
      case 'stochastic': return 'from-purple-500 to-purple-600';
      case 'cci': return 'from-green-500 to-green-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getStrategyName = (strategy: string) => {
    switch (strategy) {
      case 'regime': return 'Trend + Mean Reversion';
      case 'stochastic': return 'Stochastic Oscillator';
      case 'cci': return 'CCI Extremes';
      default: return strategy;
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">📊 Live Paper Trading - 7 Day Test</h2>
        <p className="text-gray-400">Testing 3 strategies with $333 each (March 20-27, 2026)</p>
        {btcPrice > 0 && (
          <div className="mt-4 inline-block bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-6 py-3 rounded-lg font-mono text-lg">
            BTC: ${btcPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        )}
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Total Capital</div>
          <div className="text-3xl font-bold">${totalCapital.toFixed(2)}</div>
          <div className="text-sm text-gray-500 mt-1">Starting: $999</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Total P/L</div>
          <div className={`text-3xl font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {((totalPnL / 999) * 100).toFixed(2)}% ROI
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Total Trades</div>
          <div className="text-3xl font-bold">{totalTrades}</div>
          <div className="text-sm text-gray-500 mt-1">Across all strategies</div>
        </div>
      </div>

      {/* Strategy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {paperStats.map((s) => {
          const pnlPercent = ((Number(s.total_pnl) / 333) * 100);
          const avgR = s.total_trades > 0 ? (Number(s.total_pnl) / (333 * 0.005 * s.total_trades)).toFixed(2) : '0.00';
          
          return (
            <div key={s.strategy} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className={`bg-gradient-to-r ${getStrategyColor(s.strategy)} text-white px-4 py-2 rounded-lg mb-4 font-bold text-center`}>
                {getStrategyName(s.strategy)}
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-gray-400 text-sm">Capital</div>
                  <div className="text-2xl font-bold">${Number(s.capital).toFixed(2)}</div>
                  <div className={`text-sm ${pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-gray-400 text-xs">Win Rate</div>
                    <div className="text-lg font-semibold">{Number(s.win_rate).toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">{s.wins}W / {s.losses}L</div>
                  </div>

                  <div>
                    <div className="text-gray-400 text-xs">Avg R</div>
                    <div className={`text-lg font-semibold ${parseFloat(avgR) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {parseFloat(avgR) >= 0 ? '+' : ''}{avgR}R
                    </div>
                    <div className="text-xs text-gray-500">{s.total_trades} trades</div>
                  </div>
                </div>

                <div>
                  <div className="text-gray-400 text-xs">P/L</div>
                  <div className={`text-xl font-bold ${Number(s.total_pnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {Number(s.total_pnl) >= 0 ? '+' : ''}${Number(s.total_pnl).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trade History */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-bold mb-4">Recent Trades</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 text-left">
                <th className="pb-3 text-gray-400 text-sm font-semibold">Time</th>
                <th className="pb-3 text-gray-400 text-sm font-semibold">Strategy</th>
                <th className="pb-3 text-gray-400 text-sm font-semibold">Type</th>
                <th className="pb-3 text-gray-400 text-sm font-semibold">Side</th>
                <th className="pb-3 text-gray-400 text-sm font-semibold">Price</th>
                <th className="pb-3 text-gray-400 text-sm font-semibold">Size</th>
                <th className="pb-3 text-gray-400 text-sm font-semibold">P/L</th>
                <th className="pb-3 text-gray-400 text-sm font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody>
              {paperTrades.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    No trades yet. Waiting for setups...
                  </td>
                </tr>
              ) : (
                paperTrades.map((trade) => (
                  <tr key={trade.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                    <td className="py-3 text-sm font-mono text-gray-300">
                      {new Date(trade.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold bg-gradient-to-r ${getStrategyColor(trade.strategy)} text-white`}>
                        {trade.strategy}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        trade.type === 'OPEN' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {trade.type}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`font-semibold ${
                        trade.direction === 'LONG' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {trade.direction}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-gray-300">
                      ${Number(trade.price).toLocaleString()}
                    </td>
                    <td className="py-3 font-mono text-sm text-gray-400">
                      {Number(trade.size).toFixed(4)}
                    </td>
                    <td className="py-3">
                      {trade.type === 'CLOSE' ? (
                        <span className={`font-semibold ${
                          Number(trade.pnl) >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {Number(trade.pnl) >= 0 ? '+' : ''}${Number(trade.pnl).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="py-3 text-sm text-gray-400 max-w-xs truncate">
                      {trade.reason || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface Strategy {
  id: string;
  strategy_name: string;
  source_url: string;
  author: string;
  description: string;
  status: string;
  current_phase: string;
  progress_percent: number;
  pine_script: string;
  python_code: string;
  win_rate_120d: number;
  total_r_120d: number;
  trades_per_day_120d: number;
  avg_win_rate: number;
  avg_total_r: number;
  avg_trades_per_day: number;
  recommended: boolean;
  rank: number;
  notes: string;
  created_at: string;
  completed_at: string;
}

type SortOption = 'rank' | 'winRate' | 'totalR' | 'tradesPerDay';

export default function StrategyTesting() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'pine' | 'python'>('pine');
  const [sortBy, setSortBy] = useState<SortOption>('rank');

  useEffect(() => {
    fetchStrategies();

    // Real-time subscription
    const channel = supabase
      .channel('strategy-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'strategy_backtests'
        },
        () => {
          fetchStrategies();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchStrategies() {
    // Fetch from main table to get pine_script and python_code
    const { data, error } = await supabase
      .from('strategy_backtests')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setStrategies(data);
    }
    setLoading(false);
  }

  async function handleViewClick(strategyId: string) {
    // Fetch full strategy details including scripts
    const { data, error } = await supabase
      .from('strategy_backtests')
      .select('*')
      .eq('id', strategyId)
      .single();

    if (!error && data) {
      setSelectedStrategy(data);
      setShowModal(true);
      setActiveTab('pine');
    }
  }

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    alert(`${type} script copied to clipboard!`);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-gray-500',
      researching: 'bg-blue-500',
      converting: 'bg-yellow-500',
      backtesting: 'bg-purple-500',
      complete: 'bg-green-500',
      failed: 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const inProgressStrategies = strategies.filter(s => 
    ['pending', 'researching', 'converting', 'backtesting'].includes(s.status)
  );
  
  // Sort completed strategies based on selected option
  const completedStrategies = strategies
    .filter(s => s.status === 'complete')
    .sort((a, b) => {
      switch (sortBy) {
        case 'winRate':
          // Auto-detect format and normalize to percentage
          const aWinRate = (a.avg_win_rate || 0) > 1 ? a.avg_win_rate : (a.avg_win_rate || 0) * 100;
          const bWinRate = (b.avg_win_rate || 0) > 1 ? b.avg_win_rate : (b.avg_win_rate || 0) * 100;
          return bWinRate - aWinRate; // Descending
        case 'totalR':
          return (b.avg_total_r || -999) - (a.avg_total_r || -999); // Descending
        case 'tradesPerDay':
          return (b.avg_trades_per_day || 0) - (a.avg_trades_per_day || 0); // Descending
        case 'rank':
        default:
          return (a.rank || 999) - (b.rank || 999); // Ascending
      }
    });
  
  const failedStrategies = strategies.filter(s => s.status === 'failed');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-800 rounded w-64 mb-8"></div>
            <div className="h-64 bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">🔬 Strategy Testing</h1>
            <p className="text-gray-400">TradingView strategy research & backtesting</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-gray-800 px-4 py-2 rounded-lg">
              <div className="text-sm text-gray-400">Total Tested</div>
              <div className="text-2xl font-bold">{strategies.length}</div>
            </div>
            <div className="bg-green-900/30 px-4 py-2 rounded-lg">
              <div className="text-sm text-gray-400">Recommended</div>
              <div className="text-2xl font-bold text-green-400">
                {strategies.filter(s => s.recommended).length}
              </div>
            </div>
          </div>
        </div>

        {/* In Progress Section */}
        {inProgressStrategies.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">⏳ In Progress</h2>
            <div className="grid gap-4">
              {inProgressStrategies.map((strategy) => (
                <div key={strategy.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{strategy.strategy_name}</h3>
                      {strategy.author && (
                        <p className="text-sm text-gray-400">by {strategy.author}</p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(strategy.status)} text-white`}>
                      {strategy.status}
                    </span>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">{strategy.current_phase}</span>
                      <span className="text-gray-400">{Math.round((strategy.progress_percent || 0))}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${strategy.progress_percent || 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {strategy.source_url && (
                    <a
                      href={strategy.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:underline"
                    >
                      View on TradingView →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Section */}
        {completedStrategies.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">✅ Completed Backtests</h2>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400">Sort by:</label>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-gray-700 text-white px-3 py-1 rounded border border-gray-600 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="rank">Rank (Default)</option>
                  <option value="winRate">Win Rate (High → Low)</option>
                  <option value="totalR">Total R (High → Low)</option>
                  <option value="tradesPerDay">Trades/Day (High → Low)</option>
                </select>
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Strategy</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Win Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Total R (120d)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Trades/Day</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {completedStrategies
                    .sort((a, b) => (a.rank || 999) - (b.rank || 999))
                    .map((strategy) => (
                      <tr key={strategy.id} className={strategy.recommended ? 'bg-green-900/10' : ''}>
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {strategy.recommended && <span className="text-yellow-400">⭐</span>}
                              {strategy.strategy_name}
                              {strategy.rank && (
                                <span className="text-xs text-gray-400">#{strategy.rank}</span>
                              )}
                            </div>
                            {strategy.author && (
                              <div className="text-sm text-gray-400">{strategy.author}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-medium ${
                            (() => {
                              const val = strategy.avg_win_rate || 0;
                              // Auto-detect format: if > 1, it's already a percentage
                              const percent = val > 1 ? val : val * 100;
                              return percent >= 50 ? 'text-green-400' : 'text-red-400';
                            })()
                          }`}>
                            {(() => {
                              if (!strategy.avg_win_rate) return '-';
                              // Auto-detect: if > 1, already percentage; else multiply by 100
                              const percent = strategy.avg_win_rate > 1 
                                ? strategy.avg_win_rate 
                                : strategy.avg_win_rate * 100;
                              return percent.toFixed(1);
                            })()}%
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {strategy.avg_total_r !== null && strategy.avg_total_r !== undefined ? (
                            <span className={`font-medium ${
                              strategy.avg_total_r > 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {strategy.avg_total_r > 0 ? '+' : ''}
                              {strategy.avg_total_r.toFixed(2)}R
                            </span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-300">
                            {strategy.avg_trades_per_day?.toFixed(1) || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {strategy.recommended ? (
                            <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded text-xs font-medium">
                              ✨ Recommended
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleViewClick(strategy.id)}
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                          >
                            View →
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Failed Section */}
        {failedStrategies.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-red-400">❌ Failed</h2>
            <div className="grid gap-4">
              {failedStrategies.map((strategy) => (
                <div key={strategy.id} className="bg-red-900/10 rounded-lg p-4 border border-red-900/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-red-400">{strategy.strategy_name}</h3>
                      {strategy.notes && (
                        <p className="text-sm text-gray-400 mt-1">{strategy.notes}</p>
                      )}
                    </div>
                    {strategy.source_url && (
                      <a
                        href={strategy.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:underline"
                      >
                        View →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {strategies.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-xl mb-2">No strategies tested yet</p>
            <p className="text-sm">Run the Strategy Tester agent to begin</p>
          </div>
        )}

        {/* Paper Trading Section - Live 7-Day Test */}
        <div className="mt-16 pt-8 border-t-4 border-blue-600">
          <PaperTradingSection />
        </div>
      </div>

      {/* Modal for Scripts */}
      {showModal && selectedStrategy && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold">{selectedStrategy.strategy_name}</h2>
                  {selectedStrategy.author && (
                    <p className="text-gray-400 text-sm">by {selectedStrategy.author}</p>
                  )}
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('pine')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'pine'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  📜 Pine Script (TradingView)
                </button>
                <button
                  onClick={() => setActiveTab('python')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'python'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  🐍 Python (Converted)
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'pine' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Original Pine Script</h3>
                    <button
                      onClick={() => copyToClipboard(selectedStrategy.pine_script || '', 'Pine Script')}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                    >
                      📋 Copy
                    </button>
                  </div>
                  <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
                    <code className="text-green-400">
                      {selectedStrategy.pine_script || 'No Pine Script available'}
                    </code>
                  </pre>
                </div>
              )}

              {activeTab === 'python' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Converted Python Code</h3>
                    <button
                      onClick={() => copyToClipboard(selectedStrategy.python_code || '', 'Python')}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                    >
                      📋 Copy
                    </button>
                  </div>
                  <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
                    <code className="text-blue-400">
                      {selectedStrategy.python_code || 'No Python code available yet'}
                    </code>
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-700 bg-gray-800">
              {selectedStrategy.source_url && (
                <a
                  href={selectedStrategy.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline text-sm"
                >
                  View original on TradingView →
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
