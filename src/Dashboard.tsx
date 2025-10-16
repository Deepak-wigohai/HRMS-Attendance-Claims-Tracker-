import { useState, useEffect } from 'react'
import SidebarLayout from './SidebarLayout'
import apiService from './services/api'
import { io } from 'socket.io-client'

interface TodayClaim {
  morningEligible: boolean
  eveningEligible: boolean
  morningCredit: number
  eveningCredit: number
  totalCredit: number
  firstLogin?: string | null
  lastLogout?: string | null
}

interface AttendanceRecord {
  id: number
  user_id: number
  login_time: string
  logout_time: string | null
  created_at: string
  updated_at: string
}

interface AttendanceResponse {
  records: AttendanceRecord[]
}

function Dashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [availableCredits, setAvailableCredits] = useState<number>(0)
  const [earnedCredits, setEarnedCredits] = useState<number>(0)
  const [claimedCredits, setClaimedCredits] = useState<number>(0)
  const [redeemAmount, setRedeemAmount] = useState<string>("")
  const [redeemNote, setRedeemNote] = useState<string>("")
  const [todayClaim, setTodayClaim] = useState<TodayClaim | null>(null)
  const [monthSummary, setMonthSummary] = useState<{ year: number; month: number; earnedInMonth: number; claimedInMonth: number; remaining: number } | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
  })

  // Action-scoped loaders to avoid blocking all buttons at once
  const [punchInLoading, setPunchInLoading] = useState(false)
  const [punchOutLoading, setPunchOutLoading] = useState(false)
  const [myUserId, setMyUserId] = useState<number | null>(null)

  // Real API calls to fetch dashboard data
  useEffect(() => {
    const fetchMonthSummary = (ym?: string) => {
      const value = ym || selectedMonth
      const [yStr, mStr] = value.split('-')
      const y = parseInt(yStr, 10)
      const m = parseInt(mStr, 10)
      return apiService.getMonthSummary(y, m).then((summaryResponse) => {
        if (summaryResponse && summaryResponse.data) {
          const s = summaryResponse.data as any
          setMonthSummary({
            year: Number(s.year),
            month: Number(s.month),
            earnedInMonth: Number(s.earnedInMonth || 0),
            claimedInMonth: Number(s.claimedInMonth || 0),
            remaining: Number(s.remaining || 0),
          })
        }
      })
    }

    const fetchDashboardData = () => {
      setLoading(true)
      
      apiService
        .getTodayAttendance()
        .then((attendanceResponse) => {
          if (attendanceResponse.data) {
            const records = (attendanceResponse.data as AttendanceResponse).records || []
            const hasActiveSession = records.some((record: AttendanceRecord) => !record.logout_time)
            setIsLoggedIn(hasActiveSession)
          }
          return apiService.getAvailableCredits()
        })
        .then((creditsResponse) => {
          if (creditsResponse.data) {
            const data = creditsResponse.data as unknown as { available: number; earned: number; claimed: number }
            setAvailableCredits(data.available || 0)
            setEarnedCredits(data.earned || 0)
            setClaimedCredits(data.claimed || 0)
          }
          return apiService.getTodayClaim()
        })
        .then((claimResponse) => {
          if (claimResponse && claimResponse.data) {
            const d = claimResponse.data as unknown as any
            setTodayClaim({
              morningEligible: !!d.morningEligible,
              eveningEligible: !!d.eveningEligible,
              morningCredit: Number(d.morningCredit || 0),
              eveningCredit: Number(d.eveningCredit || 0),
              totalCredit: Number(d.totalCredit || 0),
              firstLogin: d.firstLogin || null,
              lastLogout: d.lastLogout || null,
            })
          }
          return fetchMonthSummary()
        })
        .catch((err) => {
          console.error('Failed to load dashboard data:', err)
          setError('Failed to load dashboard data')
          setIsLoggedIn(false)
        })
        .finally(() => setLoading(false))
    }

    fetchDashboardData()
  }, [])

  // Fetch current user id for filtering events
  useEffect(() => {
    apiService.getUserProfile().then((res: any) => {
      const id = (res?.data as any)?.id
      if (Number.isFinite(Number(id))) setMyUserId(Number(id))
    }).catch(() => void 0)
  }, [])

  // Listen for server notifications about approved/redeemed claims
  useEffect(() => {
    const SOCKET_URL = (import.meta as any)?.env?.VITE_SOCKET_URL || 'http://localhost:5000'
    const socket = io(SOCKET_URL, { path: '/socket.io' })

    const handler = (p: any) => {
      if (myUserId && Number(p?.userId) !== myUserId) return
      setSuccessMessage('Your redeem was approved and credited')
      refreshCreditsAndMonthSummary()
      setTimeout(() => setSuccessMessage(null), 3000)
    }

    socket.on('claims:approved', handler)
    socket.on('claims:redeemed', handler)

    return () => {
      try {
        socket.off('claims:approved', handler)
        socket.off('claims:redeemed', handler)
        socket.close()
      } catch {}
    }
  }, [myUserId])

  const eveningFinished = new Date().getHours() >= 19
  const creditsStatus = !eveningFinished
    ? 'Can earn credits'
    : (todayClaim && (todayClaim.morningCredit > 0 || todayClaim.eveningCredit > 0))
      ? 'Earned credits'
      : 'No further credits available'

  const refreshPresentStatusCard = () => {
    return apiService.getTodayAttendance().then((attendanceResponse) => {
      const records = (attendanceResponse.data as AttendanceResponse)?.records || []
      let firstLoginDate: Date | null = null
      let lastLogoutDate: Date | null = null
      for (const rec of records) {
        const login = new Date(rec.login_time)
        if (!firstLoginDate || login < firstLoginDate) firstLoginDate = login
        if (rec.logout_time) {
          const logout = new Date(rec.logout_time)
          if (!lastLogoutDate || logout > lastLogoutDate) lastLogoutDate = logout
        }
      }
      setTodayClaim((prev) => ({
        morningEligible: prev?.morningEligible ?? false,
        eveningEligible: prev?.eveningEligible ?? false,
        morningCredit: prev?.morningCredit ?? 0,
        eveningCredit: prev?.eveningCredit ?? 0,
        totalCredit: prev?.totalCredit ?? 0,
        firstLogin: firstLoginDate ? firstLoginDate.toISOString() : null,
        lastLogout: lastLogoutDate ? lastLogoutDate.toISOString() : null,
      }))
    })
  }

  const refreshCreditsAndMonthSummary = () => {
    return apiService.getAvailableCredits().then((creditsResponse) => {
      if (creditsResponse.data) {
        const data = creditsResponse.data as unknown as { available: number; earned: number; claimed: number }
        setAvailableCredits(data.available || 0)
        setEarnedCredits(data.earned || 0)
        setClaimedCredits(data.claimed || 0)
      }
      const [yStr, mStr] = selectedMonth.split('-')
      const y = parseInt(yStr, 10)
      const m = parseInt(mStr, 10)
      return apiService.getMonthSummary(y, m).then((summaryResponse) => {
        if (summaryResponse && summaryResponse.data) {
          const s = summaryResponse.data as any
          setMonthSummary({
            year: Number(s.year),
            month: Number(s.month),
            earnedInMonth: Number(s.earnedInMonth || 0),
            claimedInMonth: Number(s.claimedInMonth || 0),
            remaining: Number(s.remaining || 0),
          })
        }
      })
    })
  }

  const refreshTodayClaimFromServer = () => {
    return apiService.getTodayClaim().then((claimResponse) => {
      if (claimResponse && claimResponse.data) {
        const d = claimResponse.data as unknown as any
        setTodayClaim({
          morningEligible: !!d.morningEligible,
          eveningEligible: !!d.eveningEligible,
          morningCredit: Number(d.morningCredit || 0),
          eveningCredit: Number(d.eveningCredit || 0),
          totalCredit: Number(d.totalCredit || 0),
          firstLogin: d.firstLogin || null,
          lastLogout: d.lastLogout || null,
        })
      }
    })
  }

  const refreshAfterAttendanceChange = () => {
    return refreshPresentStatusCard()
      .then(() => Promise.all([
        refreshCreditsAndMonthSummary(),
        refreshTodayClaimFromServer(),
      ]))
      .then(() => void 0)
  }

  const redeemDirect = (amount: number, note: string) => {
    // Convert direct redeem into a request to admin
    // keep UI interactive; no loading state
    setError(null)
    setSuccessMessage('Redeem request sent to admin')
    setTimeout(() => setSuccessMessage(null), 3000)
    return apiService
      .createRedeemRequest(amount, note)
      .then((resp) => {
        if (resp.error) {
          setError(resp.error)
          setSuccessMessage(null)
          return
        }
        // keep the success toast already shown
      })
      .catch(() => {
        setError('Failed to create redeem request')
        setSuccessMessage(null)
      })
      .finally(() => void 0)
  }

  const handlePunchIn = () => {
    setPunchInLoading(true)
    apiService
      .clockIn()
      .then((response) => {
        if (response.error) {
          setError(response.error)
          setSuccessMessage(null)
        } else {
          setError('')
          setSuccessMessage('Punch in successful!')
          setIsLoggedIn(true)
          console.log('Punch in successful:', response.data)
          refreshAfterAttendanceChange()
          setTimeout(() => setSuccessMessage(null), 3000)
        }
      })
      .catch(() => setError('Failed to punch in'))
      .finally(() => setPunchInLoading(false))
  }

  const handlePunchOut = () => {
    setPunchOutLoading(true)
    apiService
      .clockOut()
      .then((response) => {
        if (response.error) {
          setError(response.error)
          setSuccessMessage(null)
        } else {
          setError('')
          setSuccessMessage('Punch out successful!')
          setIsLoggedIn(false)
          console.log('Punch out successful:', response.data)
          refreshAfterAttendanceChange()
          setTimeout(() => setSuccessMessage(null), 3000)
        }
      })
      .catch(() => setError('Failed to punch out'))
      .finally(() => setPunchOutLoading(false))
  }

  const handleRedeem = () => {
    // keep UI interactive; no loading state
    setError(null)
    const amountNum = parseInt(redeemAmount, 10)
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError('Enter a valid amount')
      return
    }
    // Show success first, then process
    setSuccessMessage('Redeem request sent to admin')
    setTimeout(() => setSuccessMessage(null), 3000)
    apiService
      .createRedeemRequest(amountNum, redeemNote)
      .then((resp) => {
        if (resp.error) {
          setError(resp.error)
          setSuccessMessage(null)
          return
        }
        setRedeemAmount("")
        setRedeemNote("")
      })
      .catch(() => {
        setError('Failed to create redeem request')
        setSuccessMessage(null)
      })
      .finally(() => void 0)
  }

  // Removed global blocking loader; page renders while data loads

  return (
    <SidebarLayout title="Dashboard">
      <div>
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}

        {/* Welcome Text */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Welcome</h2>
          <p className="text-gray-600">Have a productive day ahead!</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance</h3>
            <div className="space-y-3">
              <button
                onClick={handlePunchIn}
                disabled={punchInLoading}
                className="w-full bg-white text-black py-2 px-4 rounded-lg hover:bg-gray-300 shadow-sm disabled:opacity-50"
              >
                {punchInLoading ? 'Processing...' : 'Punch In'}
              </button>
              <button
                onClick={handlePunchOut}
                disabled={punchOutLoading}
                className="w-full bg-black text-white py-2 px-4 rounded-lg hover:bg-gray-300 hover:text-black shadow-sm disabled:opacity-50"
              >
                {punchOutLoading ? 'Processing...' : 'Punch Out'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Present status</h3>
            <div className="text-center">
              <div className="text-4xl font-bold text-black-600 mb-2">
                {isLoggedIn ? 'Present' : 'Absent'}
              </div>
              <p className="text-gray-600 text-sm">
                {new Date().toLocaleDateString()}
              </p>
              {todayClaim && (
                <div className="mt-4 text-xs text-gray-600">
                  <div>
                    <span className="font-medium">First login:</span>{' '}
                    {(() => {
                      const v = todayClaim.firstLogin
                      if (!v) return '—'
                      const d = new Date(v)
                      const now = new Date()
                      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
                        ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '—'
                    })()}
                  </div>
                  <div>
                    <span className="font-medium">Last logout:</span>{' '}
                    {(() => {
                      const v = todayClaim.lastLogout
                      if (!v) return '—'
                      const d = new Date(v)
                      const now = new Date()
                      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
                        ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '—'
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Can I earn credits today? */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Today's Credits</h3>
            <div className="text-sm text-gray-500 mb-1">Status</div>
            <p className="text-gray-700 mb-4">{creditsStatus}</p>
            <div className="flex flex-wrap gap-2">
              <span className={"inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm border border-gray-200 bg-white text-gray-700"}>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                {(() => {
                  const mc = todayClaim ? Number(todayClaim.morningCredit || 0) : 0
                  return mc > 0 ? `Morning earned ₹${mc}` : 'Morning didn\'t receive'
                })()}
              </span>
              <span className={"inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm border border-gray-200 bg-white text-gray-700"}>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                {(() => {
                  const ec = todayClaim ? Number(todayClaim.eveningCredit || 0) : 0
                  return ec > 0 ? `Evening earned ₹${ec}` : 'Evening didn\'t receive'
                })()}
              </span>
            </div>
          </div>

        </div>

        {/* Credits Section */}
        <div className="mt-2">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Credits</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Earned:</span>
                  <span className="font-semibold">₹{earnedCredits}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Claimed:</span>
                  <span className="font-semibold">₹{claimedCredits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Available:</span>
                  <span className="text-xl font-bold text-black-700">₹{availableCredits}</span>
                </div>
                <div className="grid grid-cols-1 gap-3 pt-2">
                  <input
                    type="number"
                    min={1}
                    value={redeemAmount}
                    onChange={(e) => setRedeemAmount(e.target.value)}
                    placeholder="Amount to redeem"
                    className="w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    value={redeemNote}
                    onChange={(e) => setRedeemNote(e.target.value)}
                    placeholder="Note (optional)"
                    className="w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
              onClick={handleRedeem}
              className="w-full bg-white text-black py-2 px-4 rounded-lg hover:bg-gray-300 hover:text-black shadow-sm"
                  >
              Redeem
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-gray-900">Claim Month</h4>
                <div className="grid grid-cols-1 gap-2">
                  <label className="text-sm text-gray-600" htmlFor="monthPicker">Select month</label>
                  <input
                    id="monthPicker"
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => {
                      const val = e.target.value
                      setSelectedMonth(val)
                      // fetch summary for selected month
                      const [yStr, mStr] = val.split('-')
                      const y = parseInt(yStr, 10)
                      const m = parseInt(mStr, 10)
                      apiService.getMonthSummary(y, m).then((summaryResponse) => {
                        if (summaryResponse && summaryResponse.data) {
                          const s = summaryResponse.data as any
                          setMonthSummary({
                            year: Number(s.year),
                            month: Number(s.month),
                            earnedInMonth: Number(s.earnedInMonth || 0),
                            claimedInMonth: Number(s.claimedInMonth || 0),
                            remaining: Number(s.remaining || 0),
                          })
                        }
                      })
                    }}
                    className="w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Earned this month:</span>
                  <span className="font-semibold">₹{monthSummary?.earnedInMonth ?? 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Already claimed:</span>
                  <span className="font-semibold">₹{monthSummary?.claimedInMonth ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Remaining:</span>
                  <span className="text-xl font-bold text-black-700">₹{monthSummary?.remaining ?? 0}</span>
                </div>
                <button
                  onClick={() => {
                    if (!monthSummary) return
                    const amt = monthSummary.remaining
                    if (!Number.isFinite(amt) || amt <= 0) return
                    redeemDirect(amt, `Monthly claim ${selectedMonth}`)
                  }}
                  disabled={!monthSummary || (monthSummary?.remaining ?? 0) <= 0}
                  className="w-full bg-black text-white py-2 px-4 rounded-lg hover:bg-gray-300 hover:text-black shadow-sm disabled:opacity-50"
                >
                  Request Remaining for Month
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </SidebarLayout>
  )
}

export default Dashboard
