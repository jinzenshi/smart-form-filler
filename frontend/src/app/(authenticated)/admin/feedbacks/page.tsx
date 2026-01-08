'use client'

import { useEffect, useState } from 'react'
import { FeedbacksTab } from '@/components/admin/tabs/FeedbacksTab'
import { getFeedbacks } from '@/lib/api-client'

export default function FeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFeedbacks().then(data => {
      setFeedbacks(data)
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

  return <FeedbacksTab initialFeedbacks={feedbacks} />
}
