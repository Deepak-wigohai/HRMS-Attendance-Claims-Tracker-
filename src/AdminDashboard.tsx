import SidebarLayout from './SidebarLayout'
import { useEffect, useMemo, useState } from 'react'
import api from './services/api'
import { io } from 'socket.io-client'

export default function AdminDashboard() {
  const isLate = (d: Date) => d.getHours() > 21 || (d.getHours() === 21 && d.getMinutes() > 30)
  const [overview, setOverview] = useState<{ totalUsers: number; totalAdmins: number; presentToday: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<Array<{ type: 'login' | 'logout'; userId: number; email?: string | null; at: string }>>([])
  const [userMap, setUserMap] = useState<Record<number, string>>({})
  const [claims, setClaims] = useState<Array<{ id: number; userId: number; email?: string | null; amount: number; note?: string | null; claimedAt: string | null }>>([])
  const aggregatedClaimsByUser = useMemo(() => {
    const map = new Map<number, { userId: number; email?: string | null; total: number }>()
    for (const c of claims) {
      const email = c.email || userMap[c.userId] || null
      const prev = map.get(c.userId) || { userId: c.userId, email, total: 0 }
      prev.total += Number(c.amount || 0)
      if (!prev.email && email) prev.email = email
      map.set(c.userId, prev)
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [claims, userMap])
  const now = new Date()
  const dateParts = new Intl.DateTimeFormat(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).formatToParts(now)
  const monthText = dateParts.find((p) => p.type === 'month')?.value || ''
  const dayText = dateParts.find((p) => p.type === 'day')?.value || ''
  const weekdayText = dateParts.find((p) => p.type === 'weekday')?.value || ''
  const yearText = dateParts.find((p) => p.type === 'year')?.value || ''
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const computeFirstLogins = (arr: Array<{ type: 'login' | 'logout'; userId: number; email?: string | null; at: string }>) => {
    const map: Record<string, { type: 'login'; userId: number; email?: string | null; at: string }> = {}
    for (const e of arr) {
      if (e.type !== 'login') continue
      const dateKey = new Date(e.at).toISOString().slice(0, 10)
      const key = `${e.userId}-${dateKey}`
      const prev = map[key]
      if (!prev || new Date(e.at).getTime() < new Date(prev.at).getTime()) {
        map[key] = { type: 'login', userId: e.userId, email: e.email, at: e.at }
      }
    }
    return Object.values(map).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  }

  useEffect(() => {
    Promise.all([api.getAdminOverview(), api.getAdminActivity(), api.getAdminUsersMin(), api.getAdminClaimsMonth(currentYear, currentMonth)])
      .then((res) => {
        const [ov, act, users, claimsMonth] = res as any
        if (ov.error) return setError(ov.error)
        setOverview(ov.data as any)
        if (!act.error) {
          const list = (act.data?.events || []) as Array<{ type: 'login' | 'logout'; userId: number; email?: string | null; at: string }>
          setEvents(computeFirstLogins(list).slice(0, 200))
        }
        if (!users.error) {
          const m: Record<number, string> = {}
          for (const u of users.data?.users || []) m[Number(u.id)] = String(u.email || '')
          setUserMap(m)
        }
        if (!claimsMonth?.error) {
          setClaims((claimsMonth.data?.claims || []) as any)
        }
      })
      .catch(() => setError('Failed to load admin overview'))
    const socket = io('http://localhost:5000', { path: '/socket.io' })
    socket.on('attendance:login', (p: any) => {
      setEvents((prev: Array<{ type: 'login' | 'logout'; userId: number; email?: string | null; at: string }>) => {
        const merged = [{ type: 'login' as const, userId: Number(p.userId), at: String(p.at) }, ...prev]
        return computeFirstLogins(merged).slice(0, 500)
      })
      setOverview((o) => (o ? { ...o, presentToday: (o.presentToday || 0) + 1 } : o))
    })
    socket.on('attendance:logout', () => {
      // Do not add logout rows to the table; only update present count
      setOverview((o) => (o ? { ...o, presentToday: Math.max(0, (o.presentToday || 0) - 1) } : o))
    })
    // Claims live status disabled per request
    return () => { socket.close() }
  }, [])

  return (
    <SidebarLayout title="Admin Dashboard">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Welcome, Admin</h2>
        <p className="text-gray-600">Here’s what’s happening today.</p>
      </div>
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Large date/time text (not a card) */}
        <div className="flex flex-col justify-center h-full space-y-2 sm:space-y-3">
          <div className="text-lg sm:text-xl font-normal text-gray-600">{monthText}</div>
          <div className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-gray-900">
            <span>{`${weekdayText} ${dayText}`}</span>
            {yearText ? <span className="text-3xl sm:text-3xl md:text-4xl font-normal text-gray-600">, {yearText}</span> : null}
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-gray-700">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* Right-side cards layout */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 h-full sm:ml-auto">
          <div className="bg-white rounded-lg shadow p-6 sm:p-8 text-center flex flex-col justify-center w-full sm:w-64 md:w-72 lg:w-80 xl:w-80 sm:flex-shrink-0">
            <div className="text-sm tracking-wide text-gray-600">Present Today</div>
            <div className="text-4xl sm:text-5xl md:text-6xl font-extrabold mt-1">{overview?.presentToday ?? '-'}</div>
          </div>
          <div className="flex flex-row sm:flex-col gap-3 sm:gap-4">
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-5 text-center flex flex-col justify-center flex-1 sm:w-24 sm:flex-none sm:w-28 md:w-32 lg:w-36">
              <div className="text-xs sm:text-sm tracking-wide text-gray-600">Admins</div>
              <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold mt-1">{overview?.totalAdmins ?? '-'}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-5 text-center flex flex-col justify-center flex-1 sm:w-24 sm:flex-none sm:w-28 md:w-32 lg:w-36">
              <div className="text-xs sm:text-sm tracking-wide text-gray-600">Users</div>
              <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold mt-1">{overview?.totalUsers ?? '-'}</div>
            </div>
          </div>
        </div>

        {/* Right column: Current month claims (summed per user) */}
        <div className="md:col-span-1 md:col-start-2 md:row-start-2 bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">Claims This Month</h3>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase tracking-wider">Total Claimed</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {aggregatedClaimsByUser.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-sm text-gray-500 text-center" colSpan={2}>No claims this month.</td>
                  </tr>
                ) : (
                  aggregatedClaimsByUser.slice(0, 50).map((u) => (
                    <tr key={u.userId}>
                      <td className="px-4 py-3 text-sm text-gray-800 text-center">
                        {(() => {
                          const email = u.email || userMap[u.userId] || `user-${u.userId}`
                          const name = String(email).split('@')[0] || `user-${u.userId}`
                          const letter = String(email).charAt(0).toUpperCase() || 'U'
                          return (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gray-600 text-white flex items-center justify-center font-semibold">
                                {letter}
                              </div>
                              <span>{name}</span>
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-center">₹{Number(u.total || 0).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="md:col-span-1 md:col-start-1 md:row-start-2 bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">Live Activity (24h)</h3>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-gray-500 uppercase tracking-wider">Punctuality</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {events.length === 0 ? (
                  <tr>
                    <td className="px-6 py-4 text-base text-gray-500 text-center" colSpan={3}>No activity in the last 24 hours.</td>
                  </tr>
                ) : (
                  (() => {
                    const logs = events.filter((e) => e.type === 'login').slice(0, 200)
                    const todayKey = new Date().toDateString()
                    const todays = logs.filter((e) => new Date(e.at).toDateString() === todayKey)
                    const yesterdays = logs.filter((e) => new Date(e.at).toDateString() !== todayKey)
                    return (
                      <>
                        {todays.map((e, idx) => (
                          <tr key={`t-${idx}`}>
                            <td className="px-6 py-3 text-base text-gray-700 text-center">
                              {(() => {
                                const email = e.email || userMap[e.userId] || `user-${e.userId}`
                                const name = String(email).split('@')[0] || `user-${e.userId}`
                                const letter = String(email).charAt(0).toUpperCase() || 'U'
                                return (
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-gray-600 text-white flex items-center justify-center font-semibold">
                                      {letter}
                                    </div>
                                    <span>{name}</span>
                                  </div>
                                )
                              })()}
                            </td>
                            <td className="px-6 py-3 text-base text-gray-900 text-center">{new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                            <td className="px-6 py-3 text-base font-medium text-center">
                              {(() => {
                                // Late badge: only meaningful for login events
                                const d = new Date(e.at)
                                const late = e.type === 'login' && isLate(d)
                                const label = e.type === 'login' ? (late ? 'Late' : 'On time') : '—'
                                const cls = e.type !== 'login' ? 'bg-gray-100 text-gray-700' : (late ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800')
                                return (
                                  <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-sm font-semibold ${cls}`}>
                                    {label}
                                  </span>
                                )
                              })()}
                            </td>
                          </tr>
                        ))}
                        {yesterdays.length > 0 && (
                          <tr>
                            <td className="px-6 py-2 bg-gray-50 text-gray-600 text-center font-semibold" colSpan={3}>Yesterday</td>
                          </tr>
                        )}
                        {yesterdays.map((e, idx) => (
                          <tr key={`y-${idx}`} className="opacity-60">
                            <td className="px-6 py-3 text-base text-gray-700 text-center">
                              {(() => {
                                const email = e.email || userMap[e.userId] || `user-${e.userId}`
                                const name = String(email).split('@')[0] || `user-${e.userId}`
                                const letter = String(email).charAt(0).toUpperCase() || 'U'
                                return (
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-gray-600 text-white flex items-center justify-center font-semibold">
                                      {letter}
                                    </div>
                                    <span>{name}</span>
                                  </div>
                                )
                              })()}
                            </td>
                            <td className="px-6 py-3 text-base text-gray-900 text-center">{new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                            <td className="px-6 py-3 text-base font-medium text-center">
                              {(() => {
                                // Late badge: only meaningful for login events
                                const d = new Date(e.at)
                                const late = e.type === 'login' && isLate(d)
                                const label = e.type === 'login' ? (late ? 'Late' : 'On time') : '—'
                                const cls = e.type !== 'login' ? 'bg-gray-100 text-gray-700' : (late ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800')
                                return (
                                  <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-sm font-semibold ${cls}`}>
                                    {label}
                                  </span>
                                )
                              })()}
                            </td>
                          </tr>
                        ))}
                      </>
                    )
                  })()
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SidebarLayout>
  )
}


