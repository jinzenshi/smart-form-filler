'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { useState } from 'react'

interface AdminHeaderProps {
  username: string
}

export function AdminHeader({ username }: AdminHeaderProps) {
  const router = useRouter()
  const [isDark, setIsDark] = useState(false)

  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle('dark')
  }

  const handleLogout = () => {
    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    document.cookie = 'username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    router.push('/login')
  }

  return (
    <header className="admin-header">
      <div className="admin-header-inner">
        <div className="admin-header-brand">
          <span className="brand-icon">◇</span>
          <h1 className="brand-title">管理后台</h1>
        </div>

        <div className="admin-header-actions">
          <button
            onClick={toggleTheme}
            className="theme-toggle"
          >
            {isDark ? '☀' : '☾'}
          </button>

          <div className="header-meta">
            <span className="header-user">
              管理员 · {username}
            </span>
            <a href="/" className="header-link">
              返回工作台
            </a>
            <Button variant="primary" size="sm" onClick={handleLogout}>
              退出
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
