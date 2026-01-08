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
    <nav className="admin-tabs">
      {tabs.map((tab) => {
        const href = `/admin/${tab.key}`
        const isActive = currentTab === tab.key ||
          (tab.key === 'users' && pathname === '/admin')

        return (
          <Link
            key={tab.key}
            href={href}
            className={cn(
              'admin-tab',
              isActive && 'admin-tab-active'
            )}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
