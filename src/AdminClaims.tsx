import SidebarLayout from './SidebarLayout'
import { useEffect, useMemo, useState } from 'react'
import api from './services/api'
import { io } from 'socket.io-client'

type RequestRow = {
  id: number
  user_id: number
  email?: string | null
  amount: number
  note?: string | null
  admin_email?: string | null
  approved: boolean
  redeemed: boolean
  created_at: string
}

export default function AdminClaims() {
  const [rows, setRows] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [actionId, setActionId] = useState<number | null>(null)

  const refresh = () => {
    setLoading(true)
    setError(null)
    api.getAdminRedeemRequests()
      .then((res: any) => {
        if (res?.error) return setError(res.error)
        const list = (res?.data?.requests || []) as RequestRow[]
        setRows(list)
      })
      .catch(() => setError('Failed to load requests'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    // Initial load
    refresh()

    // Live updates via socket.io: update local rows without page refresh
    const SOCKET_URL = (import.meta as any)?.env?.VITE_SOCKET_URL || 'http://localhost:5000'
    const socket = io(SOCKET_URL, { path: '/socket.io' })

    socket.on('claims:request', (p: any) => {
      // Insert new row if not present
      setRows((prev) => {
        const id = Number(p?.requestId || p?.id)
        if (!Number.isFinite(id)) return prev
        if (prev.some((r) => r.id === id)) return prev
        const next: RequestRow = {
          id,
          user_id: Number(p?.userId) || 0,
          email: p?.email || null,
          amount: Number(p?.amount) || 0,
          note: p?.note || null,
          admin_email: null,
          approved: false,
          redeemed: false,
          created_at: String(p?.at || new Date().toISOString()),
        }
        return [next, ...prev]
      })
    })

    const markApproved = (p: any) => {
      const id = Number(p?.requestId || p?.id)
      if (!Number.isFinite(id)) return
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, approved: true, redeemed: true } : r)))
    }

    socket.on('claims:approved', markApproved)
    socket.on('claims:redeemed', markApproved)

    return () => {
      try {
        socket.off('claims:request')
        socket.off('claims:approved')
        socket.off('claims:redeemed')
        socket.close()
      } catch {}
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => String(r.email || '').toLowerCase().includes(q) || String(r.user_id).includes(q) || String(r.id).includes(q))
  }, [rows, query])

  const approve = (id: number) => {
    setActionId(id)
    api.adminApproveRedeemRequest(id)
      .then((res: any) => {
        if (res?.error) return setError(res.error)
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, approved: true } : r)))
      })
      .catch(() => setError('Failed to approve'))
      .finally(() => setActionId(null))
  }

  const deny = (id: number) => {
    if (!confirm('Deny this request?')) return
    setActionId(id)
    api.adminDenyRedeemRequest(id)
      .then((res: any) => {
        if (res?.error) return setError(res.error)
        setRows((prev) => prev.filter((r) => r.id !== id))
      })
      .catch(() => setError('Failed to deny'))
      .finally(() => setActionId(null))
  }

  return (
    <SidebarLayout title="User Claims">
      <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="text-gray-700">Manage user credit redeem requests</div>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by user/email/id"
            className="px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Redeemed</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>Loading…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>No requests</td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-sm text-gray-700">{r.email || `user-${r.user_id}`}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">₹{Number(r.amount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.note || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${r.approved ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                      {r.approved ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${r.redeemed ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                      {r.redeemed ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        disabled={r.approved || actionId === r.id}
                        onClick={() => approve(r.id)}
                        className="px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {actionId === r.id ? 'Processing…' : r.approved ? 'Approved' : 'Approve'}
                      </button>
                      {!r.approved && (
                        <button
                          disabled={r.redeemed || actionId === r.id}
                          onClick={() => deny(r.id)}
                          className="px-3 py-1.5 rounded-md border border-red-300 text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
                        >
                          Deny
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </SidebarLayout>
  )
}


