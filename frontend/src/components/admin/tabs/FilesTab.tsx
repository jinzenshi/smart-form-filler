'use client'

import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { formatDate, formatFileSize, getFileTypeName, getFileTypeBadge } from '@/lib/utils'
import { deleteFile } from '@/lib/api-client'
import { useToast } from '@/components/common/Toast'

interface FilesTabProps {
  initialFiles: any[]
}

export function FilesTab({ initialFiles }: FilesTabProps) {
  const [files, setFiles] = useState<any[]>(initialFiles)
  const [filterType, setFilterType] = useState('')
  const [filterUsername, setFilterUsername] = useState('')
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  const filteredFiles = files.filter((file) => {
    if (filterType && file.file_type !== filterType) return false
    if (filterUsername && !file.username.includes(filterUsername)) return false
    return true
  })

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此文件？')) return

    startTransition(async () => {
      try {
        await deleteFile(id)
        setFiles(prev => prev.filter(f => f.id !== id))
        toast.success('删除成功')
      } catch {
        toast.error('删除失败')
      }
    })
  }

  const handleDownload = (url: string, filename: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">文件管理</h2>
        <div className="flex gap-3 items-center">
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-36"
          >
            <option value="">所有类型</option>
            <option value="docx">DOCX文档</option>
            <option value="user_info">个人信息</option>
            <option value="screenshot">反馈截图</option>
          </Select>
          <Input
            type="text"
            placeholder="筛选用户名"
            value={filterUsername}
            onChange={(e) => setFilterUsername(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">文件名</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">大小</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">上传时间</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredFiles.map((file) => (
              <tr key={file.id} className="hover:bg-amber-50 transition-colors">
                <td className="px-4 py-3 font-mono text-sm">{file.id}</td>
                <td className="px-4 py-3">{file.username}</td>
                <td className="px-4 py-3">
                  <Badge variant={getFileTypeBadge(file.file_type) as 'amber' | 'gray' | 'green' | 'blue' | 'purple'}>
                    {getFileTypeName(file.file_type)}
                  </Badge>
                </td>
                <td className="px-4 py-3">{file.original_filename}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{formatFileSize(file.file_size)}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{formatDate(file.created_at)}</td>
                <td className="px-4 py-3 flex gap-2">
                  <Button
                    onClick={() => handleDownload(file.public_url, file.original_filename)}
                    variant="secondary"
                    size="sm"
                  >
                    下载
                  </Button>
                  <Button
                    onClick={() => handleDelete(file.id)}
                    variant="danger"
                    size="sm"
                  >
                    删除
                  </Button>
                </td>
              </tr>
            ))}
            {filteredFiles.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  暂无文件
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
