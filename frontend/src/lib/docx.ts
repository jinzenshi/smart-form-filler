import { getAuthData } from '@/lib/auth-client'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface ProcessResult {
  success: boolean
  message?: string
  data?: string
  blob?: Blob
  balance?: number
  missing_fields?: string[]
  low_confidence_fields?: string[]
  fill_data?: string
}

function authHeader(): Record<string, string> {
  const { token } = getAuthData()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export function base64ToBlob(base64: string, mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'): Blob {
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i += 1) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: mime })
}

export async function processDocx(templateFile: File, userInfo: string, preview = true): Promise<ProcessResult> {
  const form = new FormData()
  form.append('docx', templateFile)
  form.append('user_info_text', userInfo)
  form.append('preview', preview ? 'true' : 'false')

  const res = await fetch(`${API_BASE}/api/process`, {
    method: 'POST',
    headers: {
      ...authHeader()
    },
    body: form
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }

  if (!preview) {
    const disposition = res.headers.get('content-disposition') || ''
    const isFile = disposition.includes('attachment')
    if (isFile) {
      return { success: true, blob: await res.blob() }
    }
  }

  return res.json()
}

export async function analyzeMissingFields(templateFile: File, userInfo: string): Promise<{ success: boolean; missing_fields?: string[]; message?: string }> {
  const form = new FormData()
  form.append('docx', templateFile)
  form.append('user_info_text', userInfo)

  const res = await fetch(`${API_BASE}/api/analyze-missing`, {
    method: 'POST',
    headers: {
      ...authHeader()
    },
    body: form
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }

  return res.json()
}

export async function getTokenBalance(): Promise<{ balance: number; total_balance?: number; token?: string }> {
  const res = await fetch(`${API_BASE}/api/token/balance`, {
    headers: {
      ...authHeader()
    }
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }

  return res.json()
}
