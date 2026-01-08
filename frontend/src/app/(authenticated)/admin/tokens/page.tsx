'use client'

import { useEffect, useState } from 'react'
import type { SimpleUser } from '@/types'
import { TokensTab } from '@/components/admin/tabs/TokensTab'
import { getSimpleUsers } from '@/lib/api-client'

export default function TokensPage() {
  const [users, setUsers] = useState<SimpleUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSimpleUsers().then(data => {
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

  return <TokensTab initialUsers={users} />
}
