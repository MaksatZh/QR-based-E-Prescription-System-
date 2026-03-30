const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

function getToken(): string | null {
  return localStorage.getItem('token')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))

    // Any 401 except login itself — clear storage and redirect immediately
    if (res.status === 401 && path !== '/auth/login') {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      const isSessionExpired = err.error?.includes('Session expired')
      window.location.href = isSessionExpired ? '/?reason=session' : '/?reason=unauthorized'
      throw new Error(err.error || 'Unauthorized')
    }

    throw new Error(err.error || `HTTP ${res.status}`)
  }

  return res.json()
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<{ user: any }>('/auth/me'),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
}

// ─── Prescriptions ────────────────────────────────────────────────────────────

export const prescriptionApi = {
  list: (params?: { status?: string; search?: string }) => {
    const query = new URLSearchParams(params as any).toString()
    return request<{ prescriptions: any[] }>(`/prescriptions${query ? `?${query}` : ''}`)
  },

  get: (id: string) =>
    request<{ prescription: any }>(`/prescriptions/${id}`),

  create: (data: {
    patient: { fullName: string; iin: string; phone: string; email: string }
    medications: { name: string; form: string; dosage: string; qtyPrescribed: number; course: string }[]
  }) =>
    request<{ prescription: any }>('/prescriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  edit: (id: string, data: any) =>
    request<{ prescription: any }>(`/prescriptions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  cancel: (id: string, reason?: string) =>
    request<{ prescription: any }>(`/prescriptions/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
}

// ─── Dispense ─────────────────────────────────────────────────────────────────

export const dispenseApi = {
  dispense: (prescriptionId: string, items: { medicationId: string; qtyDispensed: number }[], note?: string) =>
    request<{ prescription: any; dispenseEvent: any }>(`/dispense/${prescriptionId}`, {
      method: 'POST',
      body: JSON.stringify({ items, note }),
    }),

  history: () =>
    request<{ events: any[] }>('/dispense/history'),
}

// ─── Public (no auth) ─────────────────────────────────────────────────────────

export const publicApi = {
  getPrescription: (id: string) =>
    request<any>(`/public/prescription/${id}`),

  getQR: (id: string) =>
    request<{ qrDataUrl: string; patientUrl: string }>(`/public/qr/${id}`),
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminApi = {
  getUsers: (search?: string) => {
    const query = search ? `?search=${encodeURIComponent(search)}` : ''
    return request<{ users: any[] }>(`/admin/users${query}`)
  },

  createUser: (data: { fullName: string; email: string; phone: string; role: string }) =>
    request<{ user: any; activationLink: string }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateUser: (id: string, data: any) =>
    request<{ user: any }>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  toggleUser: (id: string) =>
    request<{ user: any }>(`/admin/users/${id}/toggle`, {
      method: 'PATCH',
    }),

  getAuditLogs: (params?: { entityType?: string; userId?: string; limit?: number }) => {
    const query = new URLSearchParams(params as any).toString()
    return request<{ logs: any[] }>(`/admin/audit-logs${query ? `?${query}` : ''}`)
  },

  getStats: () =>
    request<any>('/admin/stats'),
}
