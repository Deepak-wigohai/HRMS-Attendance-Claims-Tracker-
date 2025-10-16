// API service for backend integration
const API_BASE_URL = '/api'

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
      .then(async (response) => {
        if (response.status === 204) return { data: undefined as unknown as T }
        let data: any = undefined
        try { data = await response.json() } catch {}
        if (!response.ok) {
          throw new Error((data && data.message) || 'Request failed')
        }
        return { data } as ApiResponse<T>
      })
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
    return this.request<{ token: string; role?: 'admin' | 'user' }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }).then((response) => {
      const token = response.data?.token
      const role = (response.data?.role as 'admin' | 'user' | undefined) || 'user'
      if (token) this.setToken(token)
      try { localStorage.setItem('role', role) } catch {}
      return response
    })
  }

  getRole(): 'admin' | 'user' {
    try {
      const r = localStorage.getItem('role') as 'admin' | 'user' | null
      return (r || 'user')
    } catch {
      return 'user'
    }
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

  // Removed misleading direct redeem with amount; use redeemWithRequest instead

  // Redeem approval flow
  createRedeemRequest(amount: number, note?: string, adminEmail?: string) {
    return this.request('/claims/request-redeem', {
      method: 'POST',
      body: JSON.stringify({ amount, note, adminEmail }),
    })
  }

  getRedeemRequests() {
    return this.request<{ requests: any[] }>('/claims/redeem-requests')
  }

  redeemWithRequest(requestId: number) {
    return this.request('/claims/redeem', {
      method: 'POST',
      body: JSON.stringify({ requestId }),
    })
  }

  // Admin overview
  getAdminOverview() {
    return this.request<{ totalUsers: number; totalAdmins: number; presentToday: number }>('/admin/overview')
  }

  getAdminActivity() {
    return this.request<{ events: Array<{ type: 'login' | 'logout'; userId: number; email?: string | null; at: string }> }>('/admin/activity')
  }

  getAdminUsersMin() {
    return this.request<{ users: Array<{ id: number; email: string; role?: 'admin' | 'user' }> }>('/admin/users-min')
  }

  getAdminClaimsMonth(year: number, month: number) {
    return this.request<{ year: number; month: number; claims: Array<{ id: number; userId: number; email?: string | null; amount: number; note?: string | null; claimedAt: string | null }> }>(`/admin/claims-month?year=${year}&month=${month}`)
  }

  // Admin: redeem requests moderation
  getAdminRedeemRequests() {
    return this.request<{ requests: any[] }>(`/admin/redeem-requests`)
  }

  adminApproveRedeemRequest(id: number) {
    return this.request(`/admin/redeem-requests/${id}/approve`, { method: 'POST' })
  }

  adminDenyRedeemRequest(id: number) {
    return this.request(`/admin/redeem-requests/${id}/deny`, { method: 'POST' })
  }

  deleteUser(userId: number) {
    return this.request(`/admin/users/${userId}`, {
      method: 'DELETE',
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
