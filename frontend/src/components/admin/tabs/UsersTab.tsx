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
    <div className="tab-container">
      <div className="tab-header">
        <h2 className="tab-title">用户管理</h2>
        <button
          onClick={refresh}
          disabled={loading}
          className="btn btn-secondary"
        >
          {loading ? '刷新中...' : '刷新'}
        </button>
      </div>
      <DataTable data={users} columns={columns} />
    </div>
  )
}
