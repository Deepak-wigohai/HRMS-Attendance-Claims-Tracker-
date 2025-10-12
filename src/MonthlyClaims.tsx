import { useEffect, useMemo, useState } from 'react'
import SidebarLayout from './SidebarLayout'
import apiService from './services/api'

type ClaimItem = {
  id: number
  amount: number
  note: string | null
  claimedAt: string | null
}

type MonthResponse = {
  year: number
  month: number
  count: number
  totalClaimed: number
  claims: ClaimItem[]
}

type EarnedDay = {
  date: string
  morningCredit: number
  eveningCredit: number
  totalCredit: number
}

function MonthlyClaims() {
  const today = new Date()
  const [year, setYear] = useState<number>(today.getFullYear())
  const [month, setMonth] = useState<number>(today.getMonth() + 1)
  const [data, setData] = useState<MonthResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [earnedDays, setEarnedDays] = useState<EarnedDay[]>([])
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('monthly')
  const [yearClaims, setYearClaims] = useState<ClaimItem[]>([])

  const monthOptions = useMemo(() => (
    Array.from({ length: 12 }).map((_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString(undefined, { month: 'long' }) }))
  ), [])

  const fetchData = () => {
    setLoading(true)
    setError(null)
    if (viewMode === 'monthly') {
      const monthPromises = Array.from({ length: 12 }, (_, i) => apiService.getMonthClaim(year, i + 1))
      Promise.all(monthPromises)
        .then((results) => {
          const combined: ClaimItem[] = []
          results.forEach((res) => {
            if (!res.error && res.data) {
              const d = res.data as any as MonthResponse
              if (Array.isArray(d.claims)) combined.push(...d.claims)
            }
          })
          setYearClaims(combined)
        })
        .catch(() => {
          setError('Failed to load yearly claims')
          setYearClaims([])
        })
        .finally(() => setLoading(false))
    } else {
      Promise.all([
        apiService.getMonthClaim(year, month),
        apiService.getMonthEarned(year, month),
      ])
        .then(([claimsRes, earnedRes]) => {
          if (claimsRes.error) {
            setError(claimsRes.error)
            setData(null)
          } else {
            setData(claimsRes.data as unknown as MonthResponse)
          }
          if (!earnedRes.error && earnedRes.data) {
            const days = (earnedRes.data as any).days as EarnedDay[]
            setEarnedDays(days || [])
          } else {
            setEarnedDays([])
          }
        })
        .catch(() => {
          setError('Failed to load monthly claims')
          setData(null)
          setEarnedDays([])
        })
        .finally(() => setLoading(false))
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, viewMode])

  const monthlyYearClaims = (yearClaims || []).filter((c) => (c.note || '').toLowerCase().startsWith('monthly claim'))
  const summaryCount = viewMode === 'monthly' ? monthlyYearClaims.length : (data?.count ?? 0)
  const summaryTotal = viewMode === 'monthly' ? monthlyYearClaims.reduce((s, c) => s + (Number(c.amount) || 0), 0) : (data?.totalClaimed ?? 0)

  return (
    <SidebarLayout title="Monthly Claims">
      <div className="flex flex-col items-center">
        <div className="bg-white rounded-lg shadow p-6 mb-6 w-full max-w-4xl">
          <div className="flex flex-col md:flex-row md:items-end gap-4 justify-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <select
                className={`bg-white rounded-lg px-3 py-2 border border-gray-200 shadow-sm ${viewMode === 'monthly' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                disabled={viewMode === 'monthly'}
              >
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <input
                type="number"
                className="bg-white rounded-lg px-3 py-2 border border-gray-200 shadow-sm w-28"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">View</label>
              <select
                className="bg-white rounded-lg px-3 py-2 border border-gray-200 shadow-sm"
                value={viewMode}
                onChange={(e) => setViewMode((e.target.value as 'daily' | 'monthly'))}
              >
                <option value="daily">Show by each day</option>
                <option value="monthly">Show by month</option>
              </select>
            </div>
            <div>
              <button onClick={fetchData} className="bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-100 shadow-sm">Refresh</button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg w-full max-w-4xl text-center">{error}</div>
        )}

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 w-full max-w-4xl">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 text-center">Claims Made</div>
                <div className="text-2xl font-bold text-center">{summaryCount}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600 text-center">Total Claimed</div>
                <div className="text-2xl font-bold text-center">₹{summaryTotal}</div>
              </div>
            </div>

            {viewMode === 'daily' && (
              <div className="bg-white rounded-lg shadow mb-6 w-full max-w-4xl">
                <div className="px-6 py-4 border-b text-sm font-semibold text-gray-700 text-center">Claimed Days</div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Claimed At</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data?.claims?.length ? (
                      data.claims.map((c) => (
                        <tr key={c.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{c.claimedAt ? new Date(c.claimedAt).toLocaleString() : '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center">₹{c.amount}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">{c.note || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-6 py-4 text-sm text-gray-500 text-center" colSpan={3}>No claims for this month.</td>
                      </tr>
                    )}
                  </tbody>
                  </table>
                </div>
              </div>
            )}

            {viewMode === 'monthly' && (
              <div className="bg-white rounded-lg shadow w-full max-w-4xl">
                <div className="px-6 py-4 border-b text-sm font-semibold text-gray-700 text-center">Monthly Claims</div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(() => {
                      const monthlyClaims = (yearClaims || []).filter((c) => (c.note || '').toLowerCase().startsWith('monthly claim'))
                      return monthlyClaims.length ? monthlyClaims.map((c) => (
                        <tr key={`${c.id}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {c.claimedAt ? new Date(c.claimedAt).toLocaleString(undefined, { month: 'long', year: 'numeric' }) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {c.claimedAt ? new Date(c.claimedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center">₹{c.amount}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td className="px-6 py-4 text-sm text-gray-500 text-center" colSpan={3}>No monthly claims for this year.</td>
                        </tr>
                      )
                    })()}
                  </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </SidebarLayout>
  )
}

export default MonthlyClaims


