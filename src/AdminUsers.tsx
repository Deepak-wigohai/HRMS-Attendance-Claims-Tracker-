import SidebarLayout from './SidebarLayout'
import { useEffect, useMemo, useState } from 'react'
import api from './services/api'

type MinUser = { id: number; email: string; role?: 'admin' | 'user' }

export default function AdminUsers() {
  const [users, setUsers] = useState<MinUser[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [overview, setOverview] = useState<{ totalUsers: number; totalAdmins: number } | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([api.getAdminUsersMin(), api.getAdminOverview()])
      .then(([u, ov]: any) => {
        if (u?.error) return setError(u.error)
        setUsers(((u?.data?.users || []) as MinUser[]))
        if (!ov?.error) setOverview(ov.data as any)
      })
      .catch(() => setError('Failed to load users'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const onlyUsers = users.filter((u) => (u.role || 'user') !== 'admin')
    const arr = q
      ? onlyUsers.filter((u) => u.email.toLowerCase().includes(q) || String(u.id).includes(q))
      : onlyUsers
    return arr
  }, [users, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  const allOnPageSelected = paged.length > 0 && paged.every((u) => selectedIds.has(u.id))
  const toggleSelectAll = () => {
    const next = new Set(selectedIds)
    if (allOnPageSelected) {
      for (const u of paged) next.delete(u.id)
    } else {
      for (const u of paged) next.add(u.id)
    }
    setSelectedIds(next)
  }

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const selectedCount = selectedIds.size

  const handleDelete = (id: number, email: string) => {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return
    setLoading(true)
    api.deleteUser(id)
      .then((res: any) => {
        if (res?.error) return setError(res.error)
        setUsers((prev) => prev.filter((u) => u.id !== id))
        setSelectedIds((prev) => {
          const next = new Set(prev); next.delete(id); return next
        })
      })
      .catch(() => setError('Failed to delete user'))
      .finally(() => setLoading(false))
  }

  return (
    <SidebarLayout title="Manage Users">
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs tracking-wide text-gray-500">Total Users</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{overview?.totalUsers ?? (loading ? '…' : users.length)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs tracking-wide text-gray-500">Admins</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{overview?.totalAdmins ?? '—'}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs tracking-wide text-gray-500">Selected</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{selectedCount}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <input
              value={query}
              onChange={(e) => { setPage(1); setQuery(e.target.value) }}
              className="w-full md:w-80 px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search by email or ID"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Rows:</label>
            <select
              value={pageSize}
              onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)) }}
              className="px-2 py-1 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <button
              onClick={() => {
                setLoading(true)
                api.getAdminUsersMin()
                  .then((u: any) => { if (!u?.error) setUsers(u.data?.users || []) })
                  .finally(() => setLoading(false))
              }}
              className="ml-2 inline-flex items-center px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border-b border-red-200">{error}</div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAll} />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td className="px-6 py-6 text-center text-gray-500" colSpan={5}>Loading users…</td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td className="px-6 py-6 text-center text-gray-500" colSpan={5}>No users found.</td>
                </tr>
              ) : (
                paged.map((u) => (
                  <tr key={u.id} className={selectedIds.has(u.id) ? 'bg-indigo-50' : undefined}>
                    <td className="px-6 py-3"><input type="checkbox" checked={selectedIds.has(u.id)} onChange={() => toggleSelect(u.id)} /></td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold">
                          {String(u.email || '').charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="">{String(u.email || '').split('@')[0] || `user-${u.id}`}</div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-gray-800">{u.email}</td>
                    <td className="px-6 py-3 text-gray-600">{u.id}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="px-3 py-1.5 rounded-md border border-red-300 text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
                          onClick={() => handleDelete(u.id, u.email)}
                          disabled={loading}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-gray-600">
            Showing {(filtered.length === 0) ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(filtered.length, currentPage * pageSize)} of {filtered.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 rounded-md border bg-white text-gray-700 disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </button>
            <div className="text-sm text-gray-700">Page {currentPage} / {totalPages}</div>
            <button
              className="px-3 py-1.5 rounded-md border bg-white text-gray-700 disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </SidebarLayout>
  )
}


