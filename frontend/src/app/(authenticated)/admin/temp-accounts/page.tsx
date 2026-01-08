'use client'

import { useEffect, useState } from 'react'
import type { TempAccount } from '@/types'
import { TempAccountsTab } from '@/components/admin/tabs/TempAccountsTab'
import { getTempAccounts } from '@/lib/api-client'

export default function TempAccountsPage() {
  const [accounts, setAccounts] = useState<TempAccount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTempAccounts(false).then(data => {
      setAccounts(data)
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

  return <TempAccountsTab initialAccounts={accounts} />
}
