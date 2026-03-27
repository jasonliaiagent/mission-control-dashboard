'use client'

import { useEffect, useState } from 'react'
import { supabase, type Trade, type Stats } from '@/lib/supabase'
import Link from 'next/link'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function AnalyticsPage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: tradesData } = await supabase
          .from('trades')
          .select('*')
          .order('timestamp', { ascending: true })
        
        const { data: statsData } = await supabase
          .from('stats')
          .select('*')
          .eq('id', 1)
          .single()
        
        if (tradesData) setTrades(tradesData)
        if (statsData) setStats(statsData)
        setLoading(false)
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl">Loading analytics...</div>
      </div>
    )
  }

  // Calculate analytics
  const closedTrades = trades.filter(t => t.type === 'CLOSE')
  const wins = closedTrades.filter(t => (t.pnl || 0) > 0)
  const losses = closedTrades.filter(t => (t.pnl || 0) < 0)
  const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0
  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + (t.pnl || 0), 0) / wins.length : 0
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0) / losses.length) : 0
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0

  // Best and worst trades
  const bestTrade = closedTrades.length > 0 ? closedTrades.reduce((best, t) => ((t.pnl || 0) > (best.pnl || 0) ? t : best)) : null
  const worstTrade = closedTrades.length > 0 ? closedTrades.reduce((worst, t) => ((t.pnl || 0) < (worst.pnl || 0) ? t : worst)) : null

  // Balance curve data
  let runningBalance = stats?.balance || 0
  const balanceCurve = closedTrades.map((trade, index) => {
    runningBalance += (trade.pnl || 0)
    return {
      trade: index + 1,
      balance: runningBalance,
      pnl: trade.pnl || 0,
      date: new Date(trade.timestamp).toLocaleDateString()
    }
  }).reverse()

  // Daily P/L data
  const dailyPnl = closedTrades.reduce((acc, trade) => {
    const date = new Date(trade.timestamp).toLocaleDateString()
    if (!acc[date]) {
      acc[date] = 0
    }
    acc[date] += (trade.pnl || 0)
    return acc
  }, {} as Record<string, number>)

  const dailyPnlData = Object.entries(dailyPnl).map(([date, pnl]) => ({
    date,
    pnl
  }))

  // Win/Loss pie data
  const pieData = [
    { name: 'Wins', value: wins.length, color: '#10b981' },
    { name: 'Losses', value: losses.length, color: '#ef4444' }
  ]

  // Direction breakdown
  const longs = closedTrades.filter(t => t.direction === 'LONG')
  const shorts = closedTrades.filter(t => t.direction === 'SHORT')
  const longWins = longs.filter(t => (t.pnl || 0) > 0).length
  const shortWins = shorts.filter(t => (t.pnl || 0) > 0).length

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">📈 Performance Analytics</h1>
          <Link href="/" className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg">
            ← Back to Dashboard
          </Link>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Win Rate</div>
            <div className="text-3xl font-bold text-green-400">{winRate.toFixed(1)}%</div>
            <div className="text-xs text-gray-500">{wins.length}W / {losses.length}L</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Total P/L</div>
            <div className={`text-3xl font-bold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${totalPnl.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">{closedTrades.length} trades</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Avg Win / Loss</div>
            <div className="text-2xl font-bold">
              <span className="text-green-400">${avgWin.toFixed(2)}</span>
              <span className="text-gray-500"> / </span>
              <span className="text-red-400">${avgLoss.toFixed(2)}</span>
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Profit Factor</div>
            <div className={`text-3xl font-bold ${profitFactor >= 1 ? 'text-green-400' : 'text-red-400'}`}>
              {profitFactor.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500">Win/Loss ratio</div>
          </div>
        </div>

        {/* Balance Curve */}
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <h2 className="text-2xl font-bold mb-4">Balance Curve</h2>
          {balanceCurve.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={balanceCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="trade" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Line type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-400 py-12">No trade data yet</div>
          )}
        </div>

        {/* Daily P/L */}
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <h2 className="text-2xl font-bold mb-4">Daily P/L</h2>
          {dailyPnlData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyPnlData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Bar dataKey="pnl" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-400 py-12">No trade data yet</div>
          )}
        </div>

        {/* Win/Loss Distribution & Direction Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Pie Chart */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Win/Loss Distribution</h2>
            {closedTrades.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-gray-400 py-12">No trade data yet</div>
            )}
          </div>

          {/* Direction Stats */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Direction Performance</h2>
            <div className="space-y-4">
              <div className="bg-gray-700 p-4 rounded">
                <div className="flex justify-between mb-2">
                  <span className="text-green-400 font-semibold">LONG</span>
                  <span className="text-gray-300">{longs.length} trades</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Win Rate</span>
                  <span className="text-green-400">
                    {longs.length > 0 ? ((longWins / longs.length) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
              <div className="bg-gray-700 p-4 rounded">
                <div className="flex justify-between mb-2">
                  <span className="text-red-400 font-semibold">SHORT</span>
                  <span className="text-gray-300">{shorts.length} trades</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Win Rate</span>
                  <span className="text-red-400">
                    {shorts.length > 0 ? ((shortWins / shorts.length) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Best/Worst Trades */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-4 text-green-400">🏆 Best Trade</h2>
            {bestTrade ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">P/L</span>
                  <span className="text-green-400 font-bold text-xl">+${(bestTrade.pnl || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Direction</span>
                  <span>{bestTrade.direction}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Price</span>
                  <span className="font-mono">${bestTrade.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Date</span>
                  <span className="text-sm">{new Date(bestTrade.timestamp).toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="text-gray-400">No trades yet</div>
            )}
          </div>

          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-4 text-red-400">📉 Worst Trade</h2>
            {worstTrade ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">P/L</span>
                  <span className="text-red-400 font-bold text-xl">${(worstTrade.pnl || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Direction</span>
                  <span>{worstTrade.direction}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Price</span>
                  <span className="font-mono">${worstTrade.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Date</span>
                  <span className="text-sm">{new Date(worstTrade.timestamp).toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="text-gray-400">No trades yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
