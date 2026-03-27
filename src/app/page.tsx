'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, type Stats, type Agent, type Connection, type Position } from '@/lib/supabase'

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [btcPrice, setBtcPrice] = useState<number | null>(null)
  const [marketData, setMarketData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch stats from Supabase
        const { data: statsData } = await supabase
          .from('stats')
          .select('*')
          .eq('id', 1)
          .single()
        
        if (statsData) setStats(statsData)

        // Fetch agents
        const { data: agentsData } = await supabase
          .from('agents')
          .select('*')
        
        if (agentsData) setAgents(agentsData)

        // Fetch connections
        const { data: connectionsData } = await supabase
          .from('connections')
          .select('*')
        
        if (connectionsData) setConnections(connectionsData)

        // Fetch positions
        const { data: positionsData } = await supabase
          .from('positions')
          .select('*')
        
        if (positionsData) setPositions(positionsData)
        
        // Fetch BTC price and market data from Binance
        const priceRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT')
        const priceData = await priceRes.json()
        setBtcPrice(parseFloat(priceData.price))

        // Fetch 24h ticker for RSI/volume data
        const tickerRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT')
        const tickerData = await tickerRes.json()
        setMarketData(tickerData)
        
        setLoading(false)
      } catch (error) {
        console.error('Failed to fetch data:', error)
        setLoading(false)
      }
    }

    fetchData()
    
    // Set up real-time subscriptions
    const statsChannel = supabase
      .channel('stats-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stats' }, (payload) => {
        console.log('Stats updated:', payload)
        setStats(payload.new as Stats)
      })
      .subscribe()

    const agentsChannel = supabase
      .channel('agents-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, () => {
        supabase.from('agents').select('*').then(({ data }) => {
          if (data) setAgents(data)
        })
      })
      .subscribe()

    const positionsChannel = supabase
      .channel('positions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'positions' }, () => {
        supabase.from('positions').select('*').then(({ data }) => {
          if (data) setPositions(data)
        })
      })
      .subscribe()

    const interval = setInterval(() => {
      fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT')
        .then(res => res.json())
        .then(data => setBtcPrice(parseFloat(data.price)))
      
      fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT')
        .then(res => res.json())
        .then(data => setMarketData(data))
    }, 5000)

    return () => {
      clearInterval(interval)
      statsChannel.unsubscribe()
      agentsChannel.unsubscribe()
      positionsChannel.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">🦞 Mission Control</h1>
          <div className="flex gap-3">
            <Link href="/paper-trading" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 px-4 py-2 rounded-lg font-semibold">
              📊 Paper Trading
            </Link>
            <Link href="/trades" className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg">
              📈 Trade History
            </Link>
            <Link href="/analytics" className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg">
              📉 Analytics
            </Link>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="text-gray-400 text-sm mb-2">BTC Price</div>
            <div className="text-3xl font-bold">
              ${btcPrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="text-gray-400 text-sm mb-2">Account Balance</div>
            <div className="text-3xl font-bold">
              ${stats?.balance?.toFixed(2) || '0.00'}
            </div>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="text-gray-400 text-sm mb-2">Today's P/L</div>
            <div className={`text-3xl font-bold ${(stats?.daily_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${stats?.daily_pnl?.toFixed(2) || '0.00'}
            </div>
          </div>
        </div>

        {/* Live Positions */}
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <h2 className="text-2xl font-bold mb-4">Live Positions</h2>
          {positions.length > 0 ? (
            <div className="space-y-4">
              {positions.map((pos) => {
                const pnl = pos.unrealized_pnl || 0
                const pnlPercent = pos.entry_price ? ((pnl / (pos.entry_price * pos.size)) * 100) : 0
                return (
                  <div key={pos.id} className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-xl font-bold">{pos.coin}</span>
                        <span className={`ml-3 px-2 py-1 rounded text-sm ${pos.side === 'LONG' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                          {pos.side}
                        </span>
                      </div>
                      <div className={`text-xl font-bold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-400">Entry</div>
                        <div className="font-mono">${pos.entry_price.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Current</div>
                        <div className="font-mono">${(pos.current_price || btcPrice || 0).toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Size</div>
                        <div className="font-mono">{pos.size.toFixed(5)} BTC</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Leverage</div>
                        <div>{pos.leverage}x</div>
                      </div>
                    </div>
                    {pos.sl_price && (
                      <div className="mt-3 pt-3 border-t border-gray-600 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-400">SL</div>
                          <div className="font-mono text-red-400">${pos.sl_price.toFixed(2)}</div>
                        </div>
                        {pos.tp1_price && (
                          <div>
                            <div className="text-gray-400">TP1</div>
                            <div className="font-mono text-green-400">${pos.tp1_price.toFixed(2)}</div>
                          </div>
                        )}
                        {pos.tp2_price && (
                          <div>
                            <div className="text-gray-400">TP2</div>
                            <div className="font-mono text-green-400">${pos.tp2_price.toFixed(2)}</div>
                          </div>
                        )}
                        {pos.tp3_price && (
                          <div>
                            <div className="text-gray-400">TP3</div>
                            <div className="font-mono text-green-400">${pos.tp3_price.toFixed(2)}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              No open positions
            </div>
          )}
        </div>

        {/* Strategy Monitor */}
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <h2 className="text-2xl font-bold mb-4">Strategy Monitor</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-300">Market Conditions</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">BTC Price</span>
                  <span className="font-mono">${btcPrice?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">24h Change</span>
                  <span className={`${parseFloat(marketData?.priceChangePercent || '0') >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {marketData?.priceChangePercent ? `${parseFloat(marketData.priceChangePercent).toFixed(2)}%` : 'Loading...'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">24h Volume</span>
                  <span className="font-mono">
                    {marketData?.volume ? `${(parseFloat(marketData.volume) / 1000).toFixed(0)}K BTC` : 'Loading...'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">24h High</span>
                  <span className="font-mono text-green-400">${parseFloat(marketData?.highPrice || '0').toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">24h Low</span>
                  <span className="font-mono text-red-400">${parseFloat(marketData?.lowPrice || '0').toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-300">Signal Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-gray-700 p-3 rounded">
                  <span className="text-gray-300">Monitoring</span>
                  <span className="text-green-400 flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                    Active
                  </span>
                </div>
                <div className="bg-gray-700 p-3 rounded">
                  <div className="text-sm text-gray-400 mb-1">Next Check</div>
                  <div className="text-gray-200">Every 5 minutes (V6 Turbo)</div>
                </div>
                <div className="bg-gray-700 p-3 rounded">
                  <div className="text-sm text-gray-400 mb-1">Looking For</div>
                  <div className="text-gray-200 text-sm">
                    • Trend alignment (EMA 20/50/200)
                    <br />• RSI in range (30-65 LONG, 35-70 SHORT)
                    <br />• Volume spike ({'>'}1.1x average)
                    <br />• Min confluence: 1
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
          <h2 className="text-2xl font-bold mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <div key={agent.id} className="bg-gray-700 p-4 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold">{agent.name}</span>
                  <span className={`text-sm px-2 py-1 rounded ${agent.status === 'active' ? 'bg-green-900 text-green-300' : 'bg-gray-600 text-gray-300'}`}>
                    {agent.status}
                  </span>
                </div>
                <div className="text-sm text-gray-400">{agent.description}</div>
                <div className="text-xs text-gray-500 mt-2">v{agent.version}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-gray-500 text-sm">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}
