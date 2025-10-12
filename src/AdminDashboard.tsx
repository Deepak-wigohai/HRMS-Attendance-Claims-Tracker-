import SidebarLayout from './SidebarLayout'

export default function AdminDashboard() {
  return (
    <SidebarLayout title="Admin Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Status</div>
          <div className="text-2xl font-bold">Welcome, Admin</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Quick Tip</div>
          <div className="text-sm text-gray-800 mt-2">Use the sidebar to navigate.</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Next Steps</div>
          <ul className="list-disc ml-5 text-sm text-gray-700 mt-2 space-y-1">
            <li>Manage users (coming soon)</li>
            <li>View attendance overview</li>
            <li>Review monthly claims</li>
          </ul>
        </div>
      </div>
    </SidebarLayout>
  )
}


