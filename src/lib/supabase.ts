import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lwylhzhusaeotezdbdca.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3eWxoemh1c2Flb3RlemRiZGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NzE2MDEsImV4cCI6MjA4ODQ0NzYwMX0.V0RFtWNTA6RNmqu5lmK541S7LTYxm76TVjpZJ7lFRuE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export type Trade = {
  id: number
  coin: string
  direction: string
  type: string
  price: number
  size: number
  pnl: number
  reason: string | null
  timestamp: string
  created_at: string
}

export type Position = {
  id: number
  coin: string
  side: string
  entry_price: number
  current_price: number | null
  size: number
  unrealized_pnl: number
  leverage: number
  sl_price: number | null
  tp1_price: number | null
  tp2_price: number | null
  tp3_price: number | null
  opened_at: string | null
  updated_at: string
}

export type Stats = {
  id: number
  balance: number
  daily_pnl: number
  total_pnl: number
  total_trades: number
  win_rate: number
  updated_at: string
}

export type Agent = {
  id: string
  name: string
  status: string
  last_run: string | null
  version: string | null
  description: string | null
  updated_at: string
}

export type Connection = {
  id: string
  name: string
  status: string
  last_check: string
  error: string | null
  updated_at: string
}

export type Changelog = {
  id: number
  version: string
  title: string
  description: string | null
  created_at: string
}
