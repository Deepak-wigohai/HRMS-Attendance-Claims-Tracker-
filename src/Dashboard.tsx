import { useState, useEffect } from 'react'
import SidebarLayout from './SidebarLayout'
import apiService from './services/api'

interface UserIncentives {
  morning_incentive: number
  evening_incentive: number
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
  const [userIncentives, setUserIncentives] = useState<UserIncentives | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [availableCredits, setAvailableCredits] = useState<number>(0)
  const [earnedCredits, setEarnedCredits] = useState<number>(0)
  const [claimedCredits, setClaimedCredits] = useState<number>(0)
  const [redeemAmount, setRedeemAmount] = useState<string>("")
  const [redeemNote, setRedeemNote] = useState<string>("")

  // Real API calls to fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = () => {
      setLoading(true)
      
      apiService
        .getUserIncentives()
        .then((incentivesResponse) => {
          if (incentivesResponse.data) {
            setUserIncentives({
              morning_incentive: (incentivesResponse.data as UserIncentives).morning_incentive || 100,
              evening_incentive: (incentivesResponse.data as UserIncentives).evening_incentive || 100
            })
          }
          return apiService.getTodayAttendance()
        })
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
        })
        .catch((err) => {
          console.error('Failed to load dashboard data:', err)
          setError('Failed to load dashboard data')
          setUserIncentives({
            morning_incentive: 100,
            evening_incentive: 100
          })
          setIsLoggedIn(false)
        })
        .finally(() => setLoading(false))
    }

    fetchDashboardData()
  }, [])

  const handlePunchIn = () => {
    setLoading(true)
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
          setTimeout(() => setSuccessMessage(null), 3000)
        }
      })
      .catch(() => setError('Failed to punch in'))
      .finally(() => setLoading(false))
  }

  const handlePunchOut = () => {
    setLoading(true)
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
          setTimeout(() => setSuccessMessage(null), 3000)
        }
      })
      .catch(() => setError('Failed to punch out'))
      .finally(() => setLoading(false))
  }

  const handleRedeem = () => {
    setLoading(true)
    setError(null)
    const amountNum = parseInt(redeemAmount, 10)
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError('Enter a valid amount')
      setLoading(false)
      return
    }
    apiService
      .redeemCredits(amountNum, redeemNote)
      .then((resp) => {
        if (resp.error) {
          setError(resp.error)
          setSuccessMessage(null)
          return
        }
        setSuccessMessage('Redeemed successfully')
        setRedeemAmount("")
        setRedeemNote("")
        return apiService.getAvailableCredits().then((creditsResponse) => {
          if (creditsResponse.data) {
            const data = creditsResponse.data as unknown as { available: number; earned: number; claimed: number }
            setAvailableCredits(data.available || 0)
            setEarnedCredits(data.earned || 0)
            setClaimedCredits(data.claimed || 0)
          }
        })
      })
      .catch(() => setError('Failed to redeem credits'))
      .finally(() => setLoading(false))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

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

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance</h3>
            <div className="space-y-3">
              <button
                onClick={handlePunchIn}
                disabled={loading}
                className="w-full bg-white text-black py-2 px-4 rounded-lg hover:bg-gray-300 shadow-sm disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Punch In'}
              </button>
              <button
                onClick={handlePunchOut}
                disabled={loading}
                className="w-full bg-black text-white py-2 px-4 rounded-lg hover:bg-gray-300 hover:text-black shadow-sm disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Punch Out'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Status</h3>
            <div className="text-center">
              <div className="text-3xl font-bold text-black-600 mb-2">
                {isLoggedIn ? 'Present' : 'Absent'}
              </div>
              <p className="text-gray-600">
                {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Incentives</h3>
            {userIncentives && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Morning:</span>
                  <span className="font-semibold">₹{userIncentives.morning_incentive}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Evening:</span>
                  <span className="font-semibold">₹{userIncentives.evening_incentive}</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Credits</h3>
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
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  value={redeemNote}
                  onChange={(e) => setRedeemNote(e.target.value)}
                  placeholder="Note (optional)"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleRedeem}
                  disabled={loading}
                  className="w-full bg-white text-black py-2 px-4 rounded-lg hover:bg-gray-300 hover:text-black shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Redeem'}
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
