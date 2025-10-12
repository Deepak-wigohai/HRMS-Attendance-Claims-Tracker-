import SidebarLayout from './SidebarLayout'
import { useEffect, useState } from 'react'
import api from './services/api'

export default function AdminDashboard() {
  const [overview, setOverview] = useState<{ totalUsers: number; totalAdmins: number; presentToday: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getAdminOverview()
      .then((res) => {
        if (res.error) return setError(res.error)
        setOverview(res.data as any)
      })
      .catch(() => setError('Failed to load admin overview'))
  }, [])

  return (
    <SidebarLayout title="Admin Dashboard">
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Total Users</div>
          <div className="text-2xl font-bold">{overview?.totalUsers ?? '-'}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Admins</div>
          <div className="text-2xl font-bold">{overview?.totalAdmins ?? '-'}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Present Today</div>
          <div className="text-2xl font-bold">{overview?.presentToday ?? '-'}</div>
        </div>
      </div>
    </SidebarLayout>
  )
}


