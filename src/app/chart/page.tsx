'use client'

import { useEffect, useState } from 'react'
import { supabase, type Trade } from '@/lib/supabase'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Dynamically import chart component to avoid SSR issues
const ChartComponent = dynamic(() => import('@/components/BTCChart'), {
  ssr: false,
  loading: () => <div className="h-[500px] flex items-center justify-center">Loading chart...</div>
})

export default function ChartPage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1h'>('5m')

  useEffect(() => {
    const fetchTrades = async () => {
      const { data } = await supabase
        .from('trades')
        .select('*')
        .order('timestamp', { ascending: true })
      
      if (data) setTrades(data)
    }

    fetchTrades()

    const tradesChannel = supabase
      .channel('trades-chart')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, () => {
        fetchTrades()
      })
      .subscribe()

    return () => {
      tradesChannel.unsubscribe()
    }
  }, [])

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">📈 Live BTC Chart</h1>
          <Link href="/" className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg">
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <div className="flex gap-2">
            {(['1m', '5m', '15m', '1h'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-4 py-2 rounded ${
                  timeframe === tf ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <ChartComponent timeframe={timeframe} trades={trades} />
          <div className="mt-4 text-sm text-gray-400 text-center">
            {trades.filter(t => t.type === 'OPEN').length} trade entries marked
          </div>
        </div>
      </div>
    </div>
  )
}
