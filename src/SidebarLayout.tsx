import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

type IconProps = { className?: string }

function DashboardIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 13h8V3H3v10zM13 21h8v-6h-8v6zM13 3v8h8V3h-8zM3 21h8v-6H3v6z" />
    </svg>
  )
}

function CalendarIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function NavItem({ to, label, Icon }: { to: string; label: string; Icon: (p: IconProps) => ReactNode }) {
  const location = useLocation()
  const active = location.pathname === to
  return (
    <Link
      to={to}
      className={`group flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-colors
        ${active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
    >
      <Icon className={`h-5 w-5 ${active ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'}`} />
      <span>{label}</span>
    </Link>
  )
}

export default function SidebarLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white shadow-md flex flex-col">
        <div className="h-16 flex items-center px-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-600/10 text-indigo-700 flex items-center justify-center font-bold">HR</div>
            <span className="text-lg font-semibold text-gray-900">HRMS</span>
          </div>
        </div>
        <nav className="p-4 space-y-1">
          <NavItem to="/dashboard" label="Dashboard" Icon={DashboardIcon} />
          <NavItem to="/claims" label="Monthly Claims" Icon={CalendarIcon} />
        </nav>
        
      </aside>
      <main className="flex-1">
        <header className="bg-white shadow-sm">
          <div className="h-16 flex items-center px-6 justify-between">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <div className="flex items-center gap-2">
              <Link to="/" className="px-3 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 shadow-sm">Logout</Link>
            </div>
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}


