'use client'

import { useState, useTransition } from 'react'
import type { TempAccount } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Checkbox } from '@/components/ui/Checkbox'
import { formatDate, cn } from '@/lib/utils'
import { deleteTempAccount, batchDeleteTempAccounts, createTempAccount } from '@/lib/server-api'
import { useToast } from '@/components/common/Toast'

interface TempAccountsTabProps {
  initialAccounts: TempAccount[]
}

export function TempAccountsTab({ initialAccounts }: TempAccountsTabProps) {
  const [accounts, setAccounts] = useState<TempAccount[]>(initialAccounts)
  const [selected, setSelected] = useState<string[]>([])
  const [showExpired, setShowExpired] = useState(false)
  const [days, setDays] = useState(7)
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  const filteredAccounts = showExpired
    ? accounts
    : accounts.filter(a => !a.is_expired)

  const allSelected = filteredAccounts.length > 0 && selected.length === filteredAccounts.length

  const handleToggleAll = (checked: boolean) => {
    setSelected(checked ? filteredAccounts.map(a => a.username) : [])
  }

  const handleToggle = (username: string, checked: boolean) => {
    if (checked) {
      setSelected([...selected, username])
    } else {
      setSelected(selected.filter(s => s !== username))
    }
  }

  const handleDelete = async (username: string) => {
    if (!confirm(`确定删除临时账号 ${username}？`)) return

    startTransition(async () => {
      try {
        await deleteTempAccount(username)
        setAccounts(prev => prev.filter(a => a.username !== username))
        toast.success('删除成功')
      } catch {
        toast.error('删除失败')
      }
    })
  }

  const handleBatchDelete = async () => {
    if (!confirm(`确定删除选中的 ${selected.length} 个临时账号？`)) return

    startTransition(async () => {
      try {
        await batchDeleteTempAccounts(selected)
        setAccounts(prev => prev.filter(a => !selected.includes(a.username)))
        setSelected([])
        toast.success('批量删除成功')
      } catch {
        toast.error('批量删除失败')
      }
    })
  }

  const handleCreate = async () => {
    if (days < 1) return

    startTransition(async () => {
      try {
        const result = await createTempAccount(days)
        setAccounts(prev => [result.account, ...prev])
        await navigator.clipboard.writeText(`${result.account.username}\n${result.account.password}`)
        toast.success(`账号创建成功！已复制到剪贴板`)
      } catch {
        toast.error('创建失败')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">临时账号管理</h2>
        <div className="flex gap-3 items-center">
          <div className="flex items-center border rounded-md overflow-hidden">
            <Input
              type="number"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              min={1}
              max={365}
              className="w-20 border-none focus:outline-none focus:ring-0"
            />
            <span className="px-3 bg-gray-100 text-gray-600 text-sm">天</span>
          </div>
          <Button onClick={handleCreate} disabled={isPending} variant="primary">
            {isPending ? '创建中...' : '创建账号'}
          </Button>
          <Button
            onClick={() => setShowExpired(!showExpired)}
            variant="ghost"
          >
            {showExpired ? '隐藏过期' : '显示过期'}
          </Button>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="flex gap-3 items-center p-3 bg-amber-50 rounded-md border border-amber-200">
          <span>已选择 {selected.length} 个</span>
          <Button onClick={handleBatchDelete} disabled={isPending} variant="danger" size="sm">
            批量删除
          </Button>
          <Button
            onClick={() => setSelected([])}
            variant="ghost"
            size="sm"
          >
            取消选择
          </Button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 px-4 py-3">
                <Checkbox
                  checked={allSelected}
                  onChange={(e) => handleToggleAll(e.target.checked)}
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户名</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">密码</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">过期时间</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">剩余天数</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredAccounts.map((account) => (
              <tr key={account.username} className="hover:bg-amber-50 transition-colors">
                <td className="px-4 py-3">
                  <Checkbox
                    checked={selected.includes(account.username)}
                    onChange={(e) => handleToggle(account.username, e.target.checked)}
                  />
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium">{account.username}</span>
                </td>
                <td className="px-4 py-3">
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">{account.password}</code>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{formatDate(account.created_at)}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {account.expires_at ? formatDate(account.expires_at) : '-'}
                </td>
                <td className="px-4 py-3 text-sm">{account.days_remaining ?? '-'}</td>
                <td className="px-4 py-3">
                  <Badge variant={account.is_expired ? 'red' : 'green'}>
                    {account.is_expired ? '已过期' : '有效'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Button
                    onClick={() => handleDelete(account.username)}
                    variant="danger"
                    size="sm"
                  >
                    删除
                  </Button>
                </td>
              </tr>
            ))}
            {filteredAccounts.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  暂无临时账号
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
