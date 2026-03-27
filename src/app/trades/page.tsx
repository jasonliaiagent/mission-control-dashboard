'use client'

import { useEffect, useState } from 'react'
import { supabase, type Trade } from '@/lib/supabase'
import Link from 'next/link'

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'long' | 'short'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'open' | 'close'>('all')

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const { data } = await supabase
          .from('trades')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(100)
        
        if (data) {
          setTrades(data)
          setFilteredTrades(data)
        }
        setLoading(false)
      } catch (error) {
        console.error('Failed to fetch trades:', error)
        setLoading(false)
      }
    }

    fetchTrades()

    // Real-time subscription
    const tradesChannel = supabase
      .channel('trades-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trades' }, (payload) => {
        setTrades(prev => [payload.new as Trade, ...prev])
      })
      .subscribe()

    return () => {
      tradesChannel.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let filtered = trades

    if (filter !== 'all') {
      filtered = filtered.filter(t => t.direction.toLowerCase() === filter)
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type.toLowerCase() === typeFilter)
    }

    setFilteredTrades(filtered)
  }, [filter, typeFilter, trades])

  const stats = {
    total: trades.length,
    opens: trades.filter(t => t.type === 'OPEN').length,
    closes: trades.filter(t => t.type === 'CLOSE').length,
    totalPnl: trades.filter(t => t.type === 'CLOSE').reduce((sum, t) => sum + (t.pnl || 0), 0),
    wins: trades.filter(t => t.type === 'CLOSE' && (t.pnl || 0) > 0).length,
    losses: trades.filter(t => t.type === 'CLOSE' && (t.pnl || 0) < 0).length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl">Loading trades...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Total Trades</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Win Rate</div>
            <div className="text-2xl font-bold">
              {stats.closes > 0 ? ((stats.wins / stats.closes) * 100).toFixed(1) : '0'}%
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Wins / Losses</div>
            <div className="text-2xl font-bold">
              <span className="text-green-400">{stats.wins}</span> / <span className="text-red-400">{stats.losses}</span>
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Total P/L</div>
            <div className={`text-2xl font-bold ${stats.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${stats.totalPnl.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-sm text-gray-400 block mb-2">Direction</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600' : 'bg-gray-700'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('long')}
                  className={`px-4 py-2 rounded ${filter === 'long' ? 'bg-green-600' : 'bg-gray-700'}`}
                >
                  Long
                </button>
                <button
                  onClick={() => setFilter('short')}
                  className={`px-4 py-2 rounded ${filter === 'short' ? 'bg-red-600' : 'bg-gray-700'}`}
                >
                  Short
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-2">Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTypeFilter('all')}
                  className={`px-4 py-2 rounded ${typeFilter === 'all' ? 'bg-blue-600' : 'bg-gray-700'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setTypeFilter('open')}
                  className={`px-4 py-2 rounded ${typeFilter === 'open' ? 'bg-purple-600' : 'bg-gray-700'}`}
                >
                  Opens
                </button>
                <button
                  onClick={() => setTypeFilter('close')}
                  className={`px-4 py-2 rounded ${typeFilter === 'close' ? 'bg-orange-600' : 'bg-gray-700'}`}
                >
                  Closes
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Trades Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {filteredTrades.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Time</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Coin</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Direction</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Price</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Size</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">P/L</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredTrades.map((trade) => (
                    <tr key={trade.id} className="hover:bg-gray-750">
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {new Date(trade.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">{trade.coin}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          trade.direction === 'LONG' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                        }`}>
                          {trade.direction}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          trade.type === 'OPEN' ? 'bg-purple-900 text-purple-300' : 'bg-orange-900 text-orange-300'
                        }`}>
                          {trade.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        ${trade.price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        {trade.size.toFixed(5)}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono text-sm font-semibold ${
                        (trade.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {trade.type === 'CLOSE' ? (
                          `${(trade.pnl || 0) >= 0 ? '+' : ''}$${(trade.pnl || 0).toFixed(2)}`
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400 max-w-xs truncate">
                        {trade.reason || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              No trades found
            </div>
          )}
        </div>

        <div className="mt-4 text-center text-gray-500 text-sm">
          Showing {filteredTrades.length} of {trades.length} trades
        </div>
      </div>
    </div>
  )
}
