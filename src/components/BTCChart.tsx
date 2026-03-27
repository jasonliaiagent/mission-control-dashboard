'use client'

import { useEffect, useRef } from 'react'
import { createChart, ColorType } from 'lightweight-charts'
import type { Trade } from '@/lib/supabase'

interface BTCChartProps {
  timeframe: '1m' | '5m' | '15m' | '1h'
  trades: Trade[]
}

export default function BTCChart({ timeframe, trades }: BTCChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartContainerRef.current || typeof window === 'undefined') return

    let chart: any = null
    let candlestickSeries: any = null

    try {
      chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: '#1f2937' },
          textColor: '#9ca3af',
        },
        grid: {
          vertLines: { color: '#374151' },
          horzLines: { color: '#374151' },
        },
        width: chartContainerRef.current.clientWidth,
        height: 500,
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
        },
      })

      candlestickSeries = (chart as any).addCandlestickSeries({
        upColor: '#10b981',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      })

      const fetchCandles = async () => {
        const intervals: Record<string, string> = { '1m': '1m', '5m': '5m', '15m': '15m', '1h': '1h' }
        const limit = 500

        try {
          const res = await fetch(
            `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${intervals[timeframe]}&limit=${limit}`
          )
          const data = await res.json()

          const candles = data.map((d: any) => ({
            time: d[0] / 1000,
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4]),
          }))

          if (candlestickSeries) {
            candlestickSeries.setData(candles)
          }
        } catch (error) {
          console.error('Failed to fetch candles:', error)
        }
      }

      fetchCandles()

      const markers = trades
        .filter(t => t.type === 'OPEN')
        .map(trade => ({
          time: new Date(trade.timestamp).getTime() / 1000,
          position: trade.direction === 'LONG' ? 'belowBar' as const : 'aboveBar' as const,
          color: trade.direction === 'LONG' ? '#10b981' : '#ef4444',
          shape: trade.direction === 'LONG' ? 'arrowUp' as const : 'arrowDown' as const,
          text: `${trade.direction} @ $${trade.price.toFixed(0)}`,
        }))

      if (markers.length > 0 && candlestickSeries) {
        candlestickSeries.setMarkers(markers)
      }

      const handleResize = () => {
        if (chartContainerRef.current && chart) {
          chart.applyOptions({ width: chartContainerRef.current.clientWidth })
        }
      }

      window.addEventListener('resize', handleResize)

      const interval = setInterval(() => {
        fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT')
          .then(res => res.json())
          .then(data => {
            const price = parseFloat(data.price)
            const now = Math.floor(Date.now() / 1000)
            if (candlestickSeries) {
              candlestickSeries.update({
                time: now,
                open: price,
                high: price,
                low: price,
                close: price,
              })
            }
          })
          .catch(err => console.error('Price update error:', err))
      }, 5000)

      return () => {
        window.removeEventListener('resize', handleResize)
        clearInterval(interval)
        if (chart) {
          try {
            chart.remove()
          } catch (e) {
            console.error('Chart cleanup error:', e)
          }
        }
      }
    } catch (error) {
      console.error('Chart initialization error:', error)
      return
    }
  }, [timeframe, trades])

  return <div ref={chartContainerRef} />
}
