'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthData, clearAuthData } from '@/lib/auth-client'

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setMounted(true)
    // Check authentication on client side
    const { token } = getAuthData()
    if (!token) {
      // Not authenticated, redirect to login
      router.replace('/login')
    } else {
      setLoading(false)
    }
  }, [router])

  // Show loading while checking auth
  if (!mounted || loading) {
    return (
      <div className="admin-layout">
        <div className="loading-container" style={{ minHeight: '60vh' }}>
          <div className="loading-spinner"></div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
