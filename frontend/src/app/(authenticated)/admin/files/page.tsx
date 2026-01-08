'use client'

import { useEffect, useState } from 'react'
import type { FileRecord } from '@/types'
import { FilesTab } from '@/components/admin/tabs/FilesTab'
import { getFiles } from '@/lib/api-client'

export default function FilesPage() {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFiles().then(data => {
      setFiles(data)
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

  return <FilesTab initialFiles={files} />
}
