import Link from 'next/link'

export default function Navigation() {
  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-2xl font-bold">
              🦞 Mission Control
            </Link>
            <div className="flex space-x-1">
              <Link href="/" className="px-4 py-2 rounded-lg transition-colors text-gray-400 hover:text-white hover:bg-gray-800">
                🏠 Dashboard
              </Link>
              <Link href="/trades" className="px-4 py-2 rounded-lg transition-colors text-gray-400 hover:text-white hover:bg-gray-800">
                📈 Trades
              </Link>
              <Link href="/analytics" className="px-4 py-2 rounded-lg transition-colors text-gray-400 hover:text-white hover:bg-gray-800">
                📉 Analytics
              </Link>
              <Link href="/chart" className="px-4 py-2 rounded-lg transition-colors text-gray-400 hover:text-white hover:bg-gray-800">
                📊 Chart
              </Link>
              <Link href="/risk" className="px-4 py-2 rounded-lg transition-colors text-gray-400 hover:text-white hover:bg-gray-800">
                🛡️ Risk
              </Link>
              <Link href="/strategy-testing" className="px-4 py-2 rounded-lg transition-colors text-gray-400 hover:text-white hover:bg-gray-800">
                🔬 Strategy Testing
              </Link>
              <Link href="/v3-test" className="px-4 py-2 rounded-lg transition-colors bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500">
                📊 V3 Test (Live)
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
