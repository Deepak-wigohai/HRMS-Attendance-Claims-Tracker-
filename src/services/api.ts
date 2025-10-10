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

  private request<T>(
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

    return fetch(url, config)
      .then((response) =>
        response
          .json()
          .then((data) => {
            if (!response.ok) {
              throw new Error(data.message || 'Request failed')
            }
            return { data } as ApiResponse<T>
          })
      )
      .catch((error) => ({ error: error instanceof Error ? error.message : 'Unknown error' }))
  }

  // Authentication endpoints
  signup(email: string, password: string) {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  login(email: string, password: string) {
    return this.request<{ token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }).then((response) => {
      if (response.data?.token) {
        this.setToken(response.data.token)
      }
      return response
    })
  }

  // Attendance endpoints
  clockIn() {
    return this.request('/attendance/login', {
      method: 'POST',
    })
  }

  clockOut() {
    return this.request('/attendance/logout', {
      method: 'POST',
    })
  }

  getTodayAttendance() {
    return this.request('/attendance/today')
  }

  // Claims endpoints
  getTodayClaim() {
    return this.request('/claims/today')
  }

  getMonthClaim(year: number, month: number) {
    return this.request(`/claims/month?year=${year}&month=${month}`)
  }

  getMonthSummary(year: number, month: number) {
    return this.request(`/claims/month-summary?year=${year}&month=${month}`)
  }

  getMonthEarned(year: number, month: number) {
    return this.request(`/claims/month-earned?year=${year}&month=${month}`)
  }

  // Credits
  getAvailableCredits() {
    return this.request('/claims/available')
  }

  redeemCredits(amount: number, note?: string) {
    return this.request('/claims/redeem', {
      method: 'POST',
      body: JSON.stringify({ amount, note }),
    })
  }

  // User endpoints
  getUserProfile() {
    return this.request('/user/profile')
  }

  // Get user incentives (using existing user model)
  getUserIncentives() {
    return this.request('/user/incentives')
  }
}

export const apiService = new ApiService()
export default apiService
