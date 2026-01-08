'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const tabs = [
  { key: 'users', label: '用户管理', icon: '◈' },
  { key: 'temp-accounts', label: '临时账号', icon: '◇' },
  { key: 'tokens', label: 'Token管理', icon: '◈' },
  { key: 'files', label: '文件管理', icon: '📁' },
  { key: 'logs', label: '操作日志', icon: '✎' },
  { key: 'feedbacks', label: '用户反馈', icon: '✉' }
] as const

export function AdminTabs() {
  const pathname = usePathname()
  const currentTab = pathname.split('/').pop() || 'users'

  return (
    <nav className="flex gap-2 p-2 bg-white rounded-lg shadow-sm border mt-6">
      {tabs.map((tab) => {
        const href = `/admin/${tab.key}`
        const isActive = currentTab === tab.key ||
          (tab.key === 'users' && pathname === '/admin')

        return (
          <Link
            key={tab.key}
            href={href}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium transition-all',
              isActive
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            )}
          >
            <span className="text-sm">{tab.icon}</span>
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
