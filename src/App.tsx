import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'
import type React from 'react'
import Login from './Login'
import AdminDashboard from './AdminDashboard'
import AdminUsers from './AdminUsers'
import AdminClaims from './AdminClaims'
import Signup from './Signup'
import Dashboard from './Dashboard'
import MonthlyClaims from './MonthlyClaims'
import About from './About'

function Welcome() {
  return (
    <div className="min-h-screen bg-white">
      {/* Main content */}
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="max-w-3xl mx-auto text-center">
          {/* Hero section */}
          <div className="mb-12">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-gray-900 mb-8 md:mb-12 leading-tight">
              Welcome to HRMS
            </h1>
          </div>

          {/* Login and Signup buttons */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
             <Link to="/login" className="px-8 sm:px-12 py-3 sm:py-4 bg-blue-600 text-white font-semibold rounded-full cursor-pointer text-center">
               Login
             </Link>
             <Link to="/signup" className="px-8 sm:px-12 py-3 sm:py-4 bg-white text-gray-900 font-semibold rounded-full border-2 border-gray-300 cursor-pointer text-center">
               Sign Up
             </Link>
          </div>
        </div>
      </div>
      
      {/* Wigohai logo at the bottom */}
      <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4">
        <img 
          src="/wigohai.webp" 
          alt="Wigohai" 
          className="w-12 h-12 sm:w-16 sm:h-16 object-contain"
        />
      </div>
    </div>
  )
}

function App() {
  const isAuthed = () => !!localStorage.getItem('token')
  const getRole = () => (localStorage.getItem('role') as 'admin' | 'user' | null) || 'user'

  function RequireAuth({ children }: { children: React.ReactElement }) {
    return isAuthed() ? children : <Navigate to="/login" replace />
  }

  function RequireAdmin({ children }: { children: React.ReactElement }) {
    return isAuthed() && getRole() === 'admin' ? children : <Navigate to="/login" replace />
  }
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        <Route path="/admin/users" element={<RequireAdmin><AdminUsers /></RequireAdmin>} />
        <Route path="/admin/claims" element={<RequireAdmin><AdminClaims /></RequireAdmin>} />
        <Route path="/claims" element={<RequireAuth><MonthlyClaims /></RequireAuth>} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Router>
  )
}

export default App
