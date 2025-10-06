// API service for backend integration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

interface ApiResponse<T> {
  data?: T
  message?: string
  error?: string
}

class ApiService {
  private token: string | null = null

  setToken(token: string) {
    this.token = token
    localStorage.setItem('token', token)
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('token')
    }
    return this.token
  }

  clearToken() {
    this.token = null
    localStorage.removeItem('token')
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`
    const token = this.getToken()

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Request failed')
      }

      return { data }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Authentication endpoints
  async signup(email: string, password: string) {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async login(email: string, password: string) {
    const response = await this.request<{ token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    if (response.data?.token) {
      this.setToken(response.data.token)
    }

    return response
  }

  // Attendance endpoints
  async clockIn() {
    return this.request('/attendance/login', {
      method: 'POST',
    })
  }

  async clockOut() {
    return this.request('/attendance/logout', {
      method: 'POST',
    })
  }

  async getTodayAttendance() {
    return this.request('/attendance/today')
  }

  // Claims endpoints
  async getTodayClaim() {
    return this.request('/claims/today')
  }

  async getMonthClaim(year: number, month: number) {
    return this.request(`/claims/month?year=${year}&month=${month}`)
  }

  // Credits
  async getAvailableCredits() {
    return this.request('/claims/available')
  }

  async redeemCredits(amount: number, note?: string) {
    return this.request('/claims/redeem', {
      method: 'POST',
      body: JSON.stringify({ amount, note }),
    })
  }

  // User endpoints
  async getUserProfile() {
    return this.request('/user/profile')
  }

  // Get user incentives (using existing user model)
  async getUserIncentives() {
    return this.request('/user/incentives')
  }
}

export const apiService = new ApiService()
export default apiService
