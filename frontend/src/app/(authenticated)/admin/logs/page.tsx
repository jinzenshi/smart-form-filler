'use client'

import { useEffect, useState } from 'react'
import type { LogEntry } from '@/types'
import { LogsTab } from '@/components/admin/tabs/LogsTab'
import { getLogs } from '@/lib/api-client'

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLogs().then(data => {
      setLogs(data)
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

  return <LogsTab initialLogs={logs} />
}
