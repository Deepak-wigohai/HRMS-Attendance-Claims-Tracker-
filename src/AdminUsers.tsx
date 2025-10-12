import SidebarLayout from './SidebarLayout'

export default function AdminUsers() {
  return (
    <SidebarLayout title="Manage Users">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-sm text-gray-600">This is a placeholder page for managing users.</div>
        <div className="text-sm text-gray-800 mt-2">You can add user list, filters, and edit actions here.</div>
      </div>
    </SidebarLayout>
  )
}


