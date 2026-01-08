import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function requireAuth() {
  const token = cookies().get('auth_token')?.value
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
    cookies().delete('auth_token')
    cookies().delete('username')
    redirect('/login')
  }
}

export function getCurrentUser() {
  return {
    token: cookies().get('auth_token')?.value,
    username: cookies().get('username')?.value
  }
}

export function setAuthCookie(token: string, username: string) {
  cookies().set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7 // 7 天
  })
  cookies().set('username', username, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7
  })
}

export function clearAuthCookie() {
  cookies().delete('auth_token')
  cookies().delete('username')
}
