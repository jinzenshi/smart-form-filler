'use server'

export async function registerAction(username: string, password: string) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

    const formData = new URLSearchParams()
    formData.append('username', username)
    formData.append('password', password)

    try {
        const response = await fetch(`${apiUrl}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        })

        if (!response.ok) {
            let message = `服务器错误: ${response.status}`
            try {
                const errorData = await response.json()
                message = errorData.detail || errorData.message || message
            } catch {
                // keep fallback
            }
            return { error: message }
        }

        const data = await response.json()

        if (data.success) {
            return { success: true, message: data.message || '注册成功' }
        }

        return { error: data.message || '注册失败' }
    } catch (err) {
        return { error: err instanceof Error ? err.message : '网络请求失败' }
    }
}
