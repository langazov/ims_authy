import { authService } from './auth'
import { config } from './config'

const API_BASE = config.apiBaseUrl

class ApiClient {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`
    
    try {
      const response = await authService.makeAuthenticatedRequest(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        return await response.json()
      }

      return {} as T
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  users = {
    getAll: () => this.get<any[]>('/api/v1/users'),
    getById: (id: string) => this.get<any>(`/api/v1/users/${id}`),
    create: (data: any) => this.post<any>('/api/v1/users', data),
    update: (id: string, data: any) => this.put<any>(`/api/v1/users/${id}`, data),
    delete: (id: string) => this.delete<any>(`/api/v1/users/${id}`),
    getGroups: (userId: string) => this.get<any[]>(`/api/v1/users/${userId}/groups`),
  }

  groups = {
    getAll: () => this.get<any[]>('/api/v1/groups'),
    getById: (id: string) => this.get<any>(`/api/v1/groups/${id}`),
    create: (data: any) => this.post<any>('/api/v1/groups', data),
    update: (id: string, data: any) => this.put<any>(`/api/v1/groups/${id}`, data),
    delete: (id: string) => this.delete<any>(`/api/v1/groups/${id}`),
    addMember: (id: string, userId: string) => this.post<any>(`/api/v1/groups/${id}/members`, { user_id: userId }),
    removeMember: (id: string, userId: string) => this.delete<any>(`/api/v1/groups/${id}/members/${userId}`),
  }

  clients = {
    getAll: () => this.get<any[]>('/api/v1/clients'),
    getById: (id: string) => this.get<any>(`/api/v1/clients/${id}`),
    create: (data: any) => this.post<any>('/api/v1/clients', data),
    update: (id: string, data: any) => this.put<any>(`/api/v1/clients/${id}`, data),
    delete: (id: string) => this.delete<any>(`/api/v1/clients/${id}`),
    activate: (id: string) => this.patch<any>(`/api/v1/clients/${id}/activate`),
    deactivate: (id: string) => this.patch<any>(`/api/v1/clients/${id}/deactivate`),
    regenerateSecret: (id: string) => this.post<any>(`/api/v1/clients/${id}/regenerate-secret`),
  }

  dashboard = {
    getStats: () => this.get<any>('/api/v1/dashboard/stats'),
  }
}

export const apiClient = new ApiClient()