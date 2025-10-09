import { useEffect, useState } from 'react'
import SidebarLayout from './SidebarLayout'
import apiService from './services/api'

type UserProfile = {
  id: number
  email: string
  morning_incentive: number | null
  evening_incentive: number | null
}

type UserIncentives = {
  morning_incentive: number
  evening_incentive: number
}

export default function About() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [incentives, setIncentives] = useState<UserIncentives | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([apiService.getUserProfile(), apiService.getUserIncentives()])
      .then(([profileResp, incentivesResp]) => {
        if (profileResp.data) setProfile(profileResp.data as unknown as UserProfile)
        if (incentivesResp.data) setIncentives(incentivesResp.data as unknown as UserIncentives)
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false))
  }, [])

  const initial = profile?.email?.[0]?.toUpperCase() || 'U'

  if (loading) {
    return (
      <SidebarLayout title="About">
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </SidebarLayout>
    )
  }

  return (
    <SidebarLayout title="About">
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Profile Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white text-gray-900 shadow-lg mb-8 border border-gray-200">
        <div className="p-6 md:p-8 flex items-center gap-4 md:gap-6">
          <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-indigo-600/10 text-indigo-700 flex items-center justify-center text-2xl md:text-3xl font-bold">
            {initial}
          </div>
          <div>
            <div className="text-sm uppercase tracking-wider text-gray-500">User Profile</div>
            <div className="text-2xl md:text-3xl font-extrabold text-gray-900">{profile?.email || 'Unknown User'}</div>
            <div className="text-gray-600">User ID: {profile?.id}</div>
          </div>
        </div>
      </div>

      {/* Details + Incentives */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">About Me</h3>
            <div className="space-y-3 text-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Email</span>
                <span className="font-medium">{profile?.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">User ID</span>
                <span className="font-medium">{profile?.id}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Incentives</h3>
            {incentives && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Morning:</span>
                  <span className="font-semibold">₹{incentives.morning_incentive}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Evening:</span>
                  <span className="font-semibold">₹{incentives.evening_incentive}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </SidebarLayout>
  )
}


