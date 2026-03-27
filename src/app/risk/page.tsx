'use client'

import { useEffect, useState } from 'react'
import { supabase, type Stats, type Position } from '@/lib/supabase'
import Link from 'next/link'

export default function RiskPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  
  // Calculator states
  const [calcRisk, setCalcRisk] = useState(5)
  const [calcEntry, setCalcEntry] = useState(68000)
  const [calcStop, setCalcStop] = useState(67500)
  const [calcSize, setCalcSize] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      const { data: statsData } = await supabase
        .from('stats')
        .select('*')
        .eq('id', 1)
        .single()
      
      const { data: positionsData } = await supabase
        .from('positions')
        .select('*')
      
      if (statsData) setStats(statsData)
      if (positionsData) setPositions(positionsData)
      setLoading(false)
    }

    fetchData()

    const statsChannel = supabase
      .channel('stats-risk')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stats' }, (payload) => {
        setStats(payload.new as Stats)
      })
      .subscribe()

    return () => {
      statsChannel.unsubscribe()
    }
  }, [])

  // Calculate position size
  useEffect(() => {
    if (stats) {
      const riskUsd = stats.balance * (calcRisk / 100)
      const slDistance = Math.abs(calcEntry - calcStop)
      const size = slDistance > 0 ? riskUsd / slDistance : 0
      setCalcSize(size)
    }
  }, [calcRisk, calcEntry, calcStop, stats])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl">Loading...</div>
      </div>
    )
  }

  const balance = stats?.balance || 0
  const dailyPnl = stats?.daily_pnl || 0
  const startingBalance = balance - dailyPnl

  // Risk calculations
  const dailyDrawdown = startingBalance > 0 ? (dailyPnl / startingBalance) * 100 : 0
  const maxDailyLoss = -10 // 10% max loss
  const remainingLoss = maxDailyLoss - dailyDrawdown
  
  // Exposure
  const totalExposure = positions.reduce((sum, p) => sum + (p.entry_price * p.size), 0)
  const exposurePercent = balance > 0 ? (totalExposure / balance) * 100 : 0

  // Goal tracking
  const targetBalance = 500
  const remaining = targetBalance - balance
  const progressPercent = (balance / targetBalance) * 100
  const daysLeft = 24 // Days remaining in March
  const requiredDaily = daysLeft > 0 ? remaining / daysLeft : 0
  const requiredDailyPercent = balance > 0 ? (requiredDaily / balance) * 100 : 0

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">🛡️ Risk Dashboard</h1>
          <Link href="/" className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg">
            ← Back to Dashboard
          </Link>
        </div>

        {/* Daily Drawdown Gauge */}
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <h2 className="text-2xl font-bold mb-4">Daily Drawdown Limit</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Current Drawdown</span>
                <span className={`font-bold ${dailyDrawdown >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {dailyDrawdown.toFixed(2)}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-4">
                <div
                  className={`h-4 rounded-full transition-all ${
                    dailyDrawdown >= 0
                      ? 'bg-green-500'
                      : dailyDrawdown > -5
                      ? 'bg-yellow-500'
                      : dailyDrawdown > -8
                      ? 'bg-orange-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(Math.abs(dailyDrawdown) * 10, 100)}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-700 p-3 rounded">
                <div className="text-gray-400">Max Loss Allowed</div>
                <div className="text-xl font-bold text-red-400">{maxDailyLoss}%</div>
              </div>
              <div className="bg-gray-700 p-3 rounded">
                <div className="text-gray-400">Remaining Buffer</div>
                <div className={`text-xl font-bold ${remainingLoss > 5 ? 'text-green-400' : 'text-orange-400'}`}>
                  {remainingLoss.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Exposure Tracker */}
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <h2 className="text-2xl font-bold mb-4">Position Exposure</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700 p-4 rounded">
              <div className="text-gray-400 text-sm">Total Exposure</div>
              <div className="text-2xl font-bold">${totalExposure.toFixed(2)}</div>
            </div>
            <div className="bg-gray-700 p-4 rounded">
              <div className="text-gray-400 text-sm">Exposure %</div>
              <div className={`text-2xl font-bold ${exposurePercent > 100 ? 'text-red-400' : 'text-green-400'}`}>
                {exposurePercent.toFixed(1)}%
              </div>
            </div>
            <div className="bg-gray-700 p-4 rounded">
              <div className="text-gray-400 text-sm">Open Positions</div>
              <div className="text-2xl font-bold">{positions.length}</div>
            </div>
          </div>
        </div>

        {/* Goal Tracker */}
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <h2 className="text-2xl font-bold mb-4">$500 Goal Tracker</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Progress</span>
                <span className="font-bold">${balance.toFixed(2)} / $500.00</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-6">
                <div
                  className="bg-gradient-to-r from-blue-600 to-green-500 h-6 rounded-full transition-all flex items-center justify-center text-xs font-bold"
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                >
                  {progressPercent.toFixed(1)}%
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-gray-700 p-3 rounded">
                <div className="text-gray-400">Remaining</div>
                <div className="text-xl font-bold">${remaining.toFixed(2)}</div>
              </div>
              <div className="bg-gray-700 p-3 rounded">
                <div className="text-gray-400">Days Left</div>
                <div className="text-xl font-bold">{daysLeft}</div>
              </div>
              <div className="bg-gray-700 p-3 rounded">
                <div className="text-gray-400">Required/Day</div>
                <div className="text-xl font-bold">${requiredDaily.toFixed(2)}</div>
              </div>
              <div className="bg-gray-700 p-3 rounded">
                <div className="text-gray-400">Required %</div>
                <div className={`text-xl font-bold ${requiredDailyPercent > 10 ? 'text-red-400' : requiredDailyPercent > 5 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {requiredDailyPercent.toFixed(2)}%
                </div>
              </div>
            </div>
            {requiredDailyPercent > 10 && (
              <div className="bg-red-900/30 border border-red-500 rounded p-3 text-sm text-red-300">
                ⚠️ Warning: Required daily return ({requiredDailyPercent.toFixed(1)}%) is very high. Goal may be unrealistic with current balance.
              </div>
            )}
          </div>
        </div>

        {/* Position Size Calculator */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Position Size Calculator</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Risk % per Trade</label>
                <input
                  type="number"
                  value={calcRisk}
                  onChange={(e) => setCalcRisk(parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-700 rounded px-4 py-2"
                  step="0.5"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Entry Price</label>
                <input
                  type="number"
                  value={calcEntry}
                  onChange={(e) => setCalcEntry(parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-700 rounded px-4 py-2"
                  step="100"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Stop Loss Price</label>
                <input
                  type="number"
                  value={calcStop}
                  onChange={(e) => setCalcStop(parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-700 rounded px-4 py-2"
                  step="100"
                />
              </div>
            </div>
            <div className="bg-gray-700 p-6 rounded-lg flex flex-col justify-center">
              <div className="text-center">
                <div className="text-gray-400 text-sm mb-2">Recommended Position Size</div>
                <div className="text-4xl font-bold mb-4">{calcSize.toFixed(5)} BTC</div>
                <div className="text-gray-400 text-sm">
                  Value: ${(calcSize * calcEntry).toFixed(2)}
                </div>
                <div className="text-gray-400 text-sm mt-2">
                  Risk: ${(balance * calcRisk / 100).toFixed(2)} ({calcRisk}%)
                </div>
                <div className="text-gray-400 text-sm">
                  Distance: ${Math.abs(calcEntry - calcStop).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
