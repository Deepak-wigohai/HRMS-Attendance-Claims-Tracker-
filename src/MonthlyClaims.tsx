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

function MonthlyClaims() {
  const today = new Date()
  const [year, setYear] = useState<number>(today.getFullYear())
  const [month, setMonth] = useState<number>(today.getMonth() + 1)
  const [data, setData] = useState<MonthResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const monthOptions = useMemo(() => (
    Array.from({ length: 12 }).map((_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString(undefined, { month: 'long' }) }))
  ), [])

  const fetchData = () => {
    setLoading(true)
    setError(null)
    apiService
      .getMonthClaim(year, month)
      .then((res) => {
        if (res.error) {
          setError(res.error)
          setData(null)
        } else {
          setData(res.data as unknown as MonthResponse)
        }
      })
      .catch(() => {
        setError('Failed to load monthly claims')
        setData(null)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month])

  return (
    <SidebarLayout title="Monthly Claims">
      <div>
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <select
                className="border rounded-lg px-3 py-2"
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value, 10))}
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
                className="border rounded-lg px-3 py-2 w-28"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
              />
            </div>
            <div>
              <button onClick={fetchData} className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white px-4 py-2 rounded-lg hover:from-indigo-600 hover:to-violet-700 shadow-sm">Refresh</button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
        )}

        {loading ? (
          <div className="text-center text-gray-600">Loading...</div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600">Claims Made</div>
                <div className="text-2xl font-bold">{data?.count ?? 0}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600">Total Claimed</div>
                <div className="text-2xl font-bold">₹{data?.totalClaimed ?? 0}</div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Claimed At</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data?.claims?.length ? (
                    data.claims.map((c) => (
                      <tr key={c.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.claimedAt ? new Date(c.claimedAt).toLocaleString() : '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">₹{c.amount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{c.note || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-6 py-4 text-sm text-gray-500" colSpan={3}>No claims for this month.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </SidebarLayout>
  )
}

export default MonthlyClaims


