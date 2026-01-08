'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
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
    <header className="bg-white border-b sticky top-0 z-100">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-amber-600 text-xl">◇</span>
          <h1 className="text-xl font-semibold text-gray-800">管理后台</h1>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg"
          >
            {isDark ? '☀' : '☾'}
          </button>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              管理员 · {username}
            </span>
            <a href="/" className="text-sm text-gray-500 hover:text-gray-700">
              返回工作台
            </a>
            <Button variant="danger" size="sm" onClick={handleLogout}>
              退出
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
