'use server'

import { redirect } from 'next/navigation'

export async function loginAction(username: string, password: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const formData = new URLSearchParams()
  formData.append('username', username)
  formData.append('password', password)

  const response = await fetch(`${apiUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString()
  })

  const data = await response.json()

  if (data.success && data.token) {
    // Return the token and username - client will store in localStorage
    return { success: true, token: data.token, username: data.username || username }
  }

  return { error: data.message || '登录失败，请检查用户名和密码' }
}
