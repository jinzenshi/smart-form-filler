'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { formatDate } from '@/lib/utils'

interface LogsTabProps {
  initialLogs: any[]
}

export function LogsTab({ initialLogs }: LogsTabProps) {
  const [logs, setLogs] = useState<any[]>(initialLogs)
  const [filterUsername, setFilterUsername] = useState('')
  const [filterOperation, setFilterOperation] = useState('')
  const [selectedLog, setSelectedLog] = useState<any | null>(null)
  const [showModal, setShowModal] = useState(false)

  const filteredLogs = logs.filter((log: any) => {
    if (filterUsername && !log.username.includes(filterUsername)) return false
    if (filterOperation && log.action !== filterOperation) return false
    return true
  })

  const showLogDetails = (log: any) => {
    setSelectedLog(log)
    setShowModal(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">操作日志</h2>
        <div className="flex gap-3 items-center">
          <Input
            type="text"
            placeholder="筛选用户名"
            value={filterUsername}
            onChange={(e) => setFilterUsername(e.target.value)}
            className="w-40"
          />
          <Select
            value={filterOperation}
            onChange={(e) => setFilterOperation(e.target.value)}
            className="w-36"
          >
            <option value="">所有操作</option>
            <option value="注册">注册</option>
            <option value="登录">登录</option>
            <option value="提交文档处理">提交文档处理</option>
            <option value="提交反馈">提交反馈</option>
            <option value="文档处理失败">文档处理失败</option>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">详情</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">数据</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredLogs.map((log) => (
              <tr
                key={log.id}
                onClick={() => showLogDetails(log)}
                className="hover:bg-amber-50 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3 font-mono text-sm">{log.id}</td>
                <td className="px-4 py-3">{log.username}</td>
                <td className="px-4 py-3">{log.action}</td>
                <td className="px-4 py-3 max-w-xs truncate text-sm text-gray-500">
                  {log.details || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{log.ip_address || '-'}</td>
                <td className="px-4 py-3">
                  <Badge variant={log.status === 'success' ? 'green' : 'red'}>
                    {log.status === 'success' ? '成功' : '失败'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{formatDate(log.created_at)}</td>
                <td className="px-4 py-3">{log.submitted_data ? '📄' : ''}</td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  暂无日志
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="操作详情"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">基本信息</label>
              <pre className="bg-gray-50 p-3 rounded text-sm">
用户名: {selectedLog.username}
操作: {selectedLog.action}
状态: {selectedLog.status === 'success' ? '成功' : '失败'}
时间: {formatDate(selectedLog.created_at)}
IP: {selectedLog.ip_address || '-'}
              </pre>
            </div>
            {selectedLog.details && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">详细信息</label>
                <pre className="bg-gray-50 p-3 rounded text-sm">{selectedLog.details}</pre>
              </div>
            )}
            {selectedLog.submitted_data && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">提交数据</label>
                <pre className="bg-gray-50 p-3 rounded text-sm">
                  {JSON.stringify(selectedLog.submitted_data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
