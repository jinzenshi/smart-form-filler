'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type {
  AdminStats, User, LogEntry, FeedbackEntry,
  TempAccount, FileRecord, SimpleUser,
  GenerateTokensResult, CreateTempAccountResult,
  TokenInfo
} from '@/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function getAuthHeaders(): Promise<HeadersInit> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...await getAuthHeaders(),
      ...options?.headers
    },
    cache: 'no-store'
  })

  if (response.status === 401) {
    await clearAuthCookie()
    redirect('/login')
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `API Error: ${response.status}`)
  }

  return response.json()
}

async function clearAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete('auth_token')
  cookieStore.delete('username')
}

// ============================================
// Admin Actions - 数据获取
// ============================================

export async function getAdminStats(): Promise<AdminStats> {
  return fetchApi<AdminStats>('/admin/stats')
}

export async function getUsers(): Promise<User[]> {
  return fetchApi<User[]>('/admin/users')
}

export async function getSimpleUsers(): Promise<SimpleUser[]> {
  return fetchApi<SimpleUser[]>('/admin/simple-users')
}

export async function getLogs(params?: { username?: string; operation?: string; limit?: number }): Promise<LogEntry[]> {
  const searchParams = new URLSearchParams()
  if (params?.username) searchParams.set('username', params.username)
  if (params?.operation) searchParams.set('operation', params.operation)
  if (params?.limit) searchParams.set('limit', String(params.limit))
  const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
  return fetchApi<LogEntry[]>(`/admin/logs${query}`)
}

export async function getFeedbacks(params?: { feedback_type?: string; status?: string; limit?: number }): Promise<FeedbackEntry[]> {
  const searchParams = new URLSearchParams()
  if (params?.feedback_type) searchParams.set('feedback_type', params.feedback_type)
  if (params?.status) searchParams.set('status', params.status)
  if (params?.limit) searchParams.set('limit', String(params.limit))
  const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
  return fetchApi<FeedbackEntry[]>(`/admin/feedbacks${query}`)
}

export async function getTempAccounts(includeExpired?: boolean): Promise<TempAccount[]> {
  const query = includeExpired ? '?include_expired=true' : ''
  return fetchApi<TempAccount[]>(`/admin/temp-accounts${query}`)
}

export async function getFiles(params?: { file_type?: string; username?: string; limit?: number }): Promise<FileRecord[]> {
  const searchParams = new URLSearchParams()
  if (params?.file_type) searchParams.set('file_type', params.file_type)
  if (params?.username) searchParams.set('username', params.username)
  if (params?.limit) searchParams.set('limit', String(params.limit))
  const query = searchParams.toString() ? `?${searchParams.toString()}` : ''
  return fetchApi<FileRecord[]>(`/admin/files${query}`)
}

// ============================================
// Admin Actions - 操作用户管理
// ============================================

export async function generateTokens(count: number, balance: number = 10): Promise<{ tokens: TokenInfo[] }> {
  const response = await fetch(`${API_BASE}/admin/generate-tokens`, {
    method: 'POST',
    headers: {
      ...await getAuthHeaders(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ count, balance }),
    cache: 'no-store'
  })

  if (response.status === 401) {
    await clearAuthCookie()
    redirect('/login')
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `API Error: ${response.status}`)
  }

  // 直接解析 JSON，不通过 fetchApi
  const data = await response.json()
  console.log('generateTokens response:', data)

  // 确保 tokens 是数组
  if (!data.tokens || !Array.isArray(data.tokens)) {
    throw new Error('Invalid response format')
  }

  return { tokens: data.tokens }
}

export async function createTempAccount(daysValid: number): Promise<CreateTempAccountResult> {
  return fetchApi<CreateTempAccountResult>('/admin/temp-accounts', {
    method: 'POST',
    body: JSON.stringify({ days_valid: daysValid })
  })
}

export async function deleteTempAccount(username: string): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(`/admin/temp-accounts/${username}`, {
    method: 'DELETE'
  })
}

export async function batchDeleteTempAccounts(usernames: string[]): Promise<{ deleted_count: number }> {
  return fetchApi<{ deleted_count: number }>('/admin/temp-accounts/batch-delete', {
    method: 'POST',
    body: JSON.stringify(usernames)
  })
}

export async function exportTempAccounts(usernames?: string[]): Promise<Blob> {
  const response = await fetch(`${API_BASE}/admin/temp-accounts/export`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: usernames ? JSON.stringify(usernames) : '[]'
  })

  if (!response.ok) {
    throw new Error('Export failed')
  }

  return response.blob()
}

export async function deleteFile(fileId: number): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(`/admin/files/${fileId}`, {
    method: 'DELETE'
  })
}
