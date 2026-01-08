'use client'

import { useEffect, useState } from 'react'
import type { User } from '@/types'
import { UsersTab } from '@/components/admin/tabs/UsersTab'
import { getUsers } from '@/lib/api-client'

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUsers().then(data => {
      setUsers(data)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="tab-container">
        <div className="loading-container" style={{ minHeight: '400px' }}>
          <div className="loading-spinner"></div>
        </div>
      </div>
    )
  }

  return <UsersTab initialUsers={users} />
}
