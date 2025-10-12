import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Login from './Login'
import AdminDashboard from './AdminDashboard'
import AdminUsers from './AdminUsers'
import Signup from './Signup'
import Dashboard from './Dashboard'
import MonthlyClaims from './MonthlyClaims'
import About from './About'

function Welcome() {
  return (
    <div className="min-h-screen bg-white">
      {/* Main content */}
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero section */}
          <div className="mb-12">
            <h1 className="text-6xl md:text-8xl font-bold text-gray-900 mb-12">
              Welcome to HRMS
            </h1>
          </div>

          {/* Login and Signup buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
             <Link to="/login" className="px-12 py-4 bg-blue-600 text-white font-semibold rounded-full cursor-pointer text-center">
               Login
             </Link>
             <Link to="/signup" className="px-12 py-4 bg-white text-gray-900 font-semibold rounded-full border-2 border-gray-300 cursor-pointer text-center">
               Sign Up
             </Link>
          </div>
        </div>
      </div>
      
      {/* Wigohai logo at the bottom */}
      <div className="fixed bottom-4 right-4">
        <img 
          src="/wigohai.webp" 
          alt="Wigohai" 
          className="w-16 h-16 object-contain"
        />
      </div>
    </div>
  )
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/claims" element={<MonthlyClaims />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Router>
  )
}

export default App
