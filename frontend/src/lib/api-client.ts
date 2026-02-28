import { getAuthData } from '@/lib/auth-client'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { token } = getAuthData()
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {})
    }
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }

  return res.json()
}

export function getUsers() {
  return apiFetch<any[]>('/api/admin/users')
}

export function getSimpleUsers() {
  return apiFetch<any[]>('/api/admin/simple-users')
}

export function getLogs() {
  return apiFetch<any[]>('/api/admin/logs')
}

export function getFeedbacks() {
  return apiFetch<any[]>('/api/admin/feedbacks')
}

export function getTempAccounts(includeExpired = false) {
  const query = includeExpired ? '?include_expired=true' : ''
  return apiFetch<any[]>(`/api/admin/temp-accounts${query}`)
}

export function getFiles() {
  return apiFetch<any[]>('/api/admin/files')
}

export function generateTokens(count: number, balance = 10) {
  return apiFetch<{ tokens: any[] }>('/api/admin/generate-tokens', {
    method: 'POST',
    body: JSON.stringify({ count, balance })
  })
}

export function deleteFile(fileId: number) {
  return apiFetch<{ success: boolean }>(`/api/admin/files/${fileId}`, {
    method: 'DELETE'
  })
}
