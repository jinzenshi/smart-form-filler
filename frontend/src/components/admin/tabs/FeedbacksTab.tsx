'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { formatDate, getFeedbackTypeName, getFeedbackStatusName } from '@/lib/utils'

interface FeedbacksTabProps {
  initialFeedbacks: any[]
}

export function FeedbacksTab({ initialFeedbacks }: FeedbacksTabProps) {
  const [feedbacks, setFeedbacks] = useState<any[]>(initialFeedbacks)
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackEntry | null>(null)
  const [showModal, setShowModal] = useState(false)

  const filteredFeedbacks = feedbacks.filter((fb) => {
    if (filterType && fb.feedback_type !== filterType) return false
    if (filterStatus && fb.status !== filterStatus) return false
    return true
  })

  const showFeedbackDetails = (fb: FeedbackEntry) => {
    setSelectedFeedback(fb)
    setShowModal(true)
  }

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'pending': return 'yellow'
      case 'processing': return 'blue'
      case 'resolved': return 'green'
      case 'closed': return 'gray'
      default: return 'gray'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">用户反馈</h2>
        <div className="flex gap-3 items-center">
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-36"
          >
            <option value="">所有类型</option>
            <option value="suggestion">功能建议</option>
            <option value="bug">Bug报告</option>
            <option value="ux">用户体验</option>
            <option value="performance">性能问题</option>
            <option value="other">其他</option>
          </Select>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-36"
          >
            <option value="">所有状态</option>
            <option value="pending">待处理</option>
            <option value="processing">处理中</option>
            <option value="resolved">已解决</option>
            <option value="closed">已关闭</option>
          </Select>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredFeedbacks.map((fb) => (
          <div
            key={fb.id}
            className="bg-white rounded-lg p-5 shadow-sm border hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="font-medium">{fb.username}</span>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className={`text-sm ${i <= fb.rating ? 'text-amber-500' : 'text-gray-300'}`}
                  >
                    ★
                  </span>
                ))}
              </div>
              {fb.status && (
                <Badge variant={getStatusBadge(fb.status) as 'amber' | 'gray' | 'green' | 'blue' | 'yellow' | 'purple'}>
                  {getFeedbackStatusName(fb.status)}
                </Badge>
              )}
              <span className="ml-auto text-sm text-gray-400">{formatDate(fb.created_at)}</span>
            </div>
            <h4 className="font-medium mb-2">{fb.title || '无标题'}</h4>
            <p className="text-gray-600 mb-3">{fb.description || fb.content}</p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400 bg-gray-100 px-2 py-1 rounded">
                {getFeedbackTypeName(fb.feedback_type || 'other')}
              </span>
              <Button
                onClick={() => showFeedbackDetails(fb)}
                variant="secondary"
                size="sm"
              >
                查看详情
              </Button>
            </div>
          </div>
        ))}
        {filteredFeedbacks.length === 0 && (
          <div className="text-center py-8 text-gray-500">暂无反馈</div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="反馈详情"
      >
        {selectedFeedback && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">基本信息</label>
              <pre className="bg-gray-50 p-3 rounded text-sm">
用户: {selectedFeedback.username}
类型: {getFeedbackTypeName(selectedFeedback.feedback_type || 'other')}
评分: {selectedFeedback.rating}/5星
状态: {getFeedbackStatusName(selectedFeedback.status || '')}
时间: {formatDate(selectedFeedback.created_at)}
              </pre>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">标题</label>
              <pre className="bg-gray-50 p-3 rounded text-sm">{selectedFeedback.title || '无标题'}</pre>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">详细描述</label>
              <pre className="bg-gray-50 p-3 rounded text-sm">{selectedFeedback.description || selectedFeedback.content}</pre>
            </div>
            {selectedFeedback.contact_email && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">联系方式</label>
                <pre className="bg-gray-50 p-3 rounded text-sm">{selectedFeedback.contact_email}</pre>
              </div>
            )}
            {selectedFeedback.screenshot_path && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">截图</label>
                <img
                  src={`/${selectedFeedback.screenshot_path}`}
                  alt="截图"
                  className="max-w-full rounded border"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              </div>
            )}
            {selectedFeedback.admin_reply && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">管理员回复</label>
                <pre className="bg-gray-50 p-3 rounded text-sm">{selectedFeedback.admin_reply}</pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
