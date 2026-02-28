'use server'

import { setAuthCookie } from '@/lib/auth'

export async function loginAction(username: string, password: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  console.log('[Login] 开始登录请求:', { username, apiUrl })

  const formData = new URLSearchParams()
  formData.append('username', username)
  formData.append('password', password)

  try {
    const response = await fetch(`${apiUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    })

    console.log('[Login] 响应状态:', response.status)

    // 检查 HTTP 状态码
    if (!response.ok) {
      let message = `服务器错误: ${response.status}`
      try {
        const errorData = await response.json()
        message = errorData.detail || errorData.message || message
      } catch {
        try {
          const errorText = await response.text()
          if (errorText) {
            message = errorText
          }
        } catch {
          // ignore parse errors and keep fallback message
        }
      }
      return { error: message }
    }

    const data = await response.json()
    console.log('[Login] 响应数据:', JSON.stringify(data))

    // 检查响应结构
    if (data.success && data.token) {
      await setAuthCookie(data.token, data.username || username)
      console.log('[Login] 登录成功')
      return { success: true, token: data.token, username: data.username || username }
    }

    console.log('[Login] 登录失败:', data.message)
    return { error: data.message || '登录失败，请检查用户名和密码' }
  } catch (err) {
    console.error('[Login] 请求异常:', err)
    return { error: err instanceof Error ? err.message : '网络请求失败' }
  }
}
