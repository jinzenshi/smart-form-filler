'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@/types'
import { DataTable } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'

interface UsersTabProps {
  initialUsers: User[]
}

export function UsersTab({ initialUsers }: UsersTabProps) {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    { key: 'id', label: 'ID', width: '80px' },
    { key: 'username', label: '用户名' },
    {
      key: 'is_admin',
      label: '管理员',
      render: (user: User) => (
        <Badge variant={user.is_admin ? 'amber' : 'gray'}>
          {user.is_admin ? '管理员' : '普通用户'}
        </Badge>
      )
    },
    {
      key: 'created_at',
      label: '创建时间',
      render: (user: User) => formatDate(user.created_at)
    }
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">用户管理</h2>
        <button
          onClick={refresh}
          disabled={loading}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
        >
          {loading ? '刷新中...' : '刷新'}
        </button>
      </div>
      <DataTable data={users} columns={columns} />
    </div>
  )
}
