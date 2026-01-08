import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function requireAuth() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) {
    redirect('/login')
  }
  return token
}

export async function requireAdmin() {
  const token = await requireAuth()

  // 验证用户是否为管理员 (调用 stats 接口验证)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const response = await fetch(`${apiUrl}/admin/stats`, {
    headers: { 'Authorization': `Bearer ${token}` },
    cache: 'no-store'
  })

  if (!response.ok) {
    const cookieStore = await cookies()
    cookieStore.delete('auth_token')
    cookieStore.delete('username')
    redirect('/login')
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies()
  return {
    token: cookieStore.get('auth_token')?.value,
    username: cookieStore.get('username')?.value
  }
}

export async function setAuthCookie(token: string, username: string) {
  const cookieStore = await cookies()
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7 // 7 天
  })
  cookieStore.set('username', username, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7
  })
}

export async function clearAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete('auth_token')
  cookieStore.delete('username')
}
