'use client'

import { useState, useTransition } from 'react'
import type { TokenInfo } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { generateTokens } from '@/lib/api-client'
import { useToast } from '@/components/common/Toast'

interface TokensTabProps {
  initialUsers: any[]
}

export function TokensTab({ initialUsers }: TokensTabProps) {
  const [users, setUsers] = useState<any[]>(initialUsers)
  const [tokenCount, setTokenCount] = useState(5)
  const [tokenBalance, setTokenBalance] = useState(10)
  const [generatedTokens, setGeneratedTokens] = useState<TokenInfo[]>([])
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  const handleGenerate = async () => {
    if (tokenCount < 1 || tokenBalance < 1) return

    startTransition(async () => {
      try {
        const result = await generateTokens(tokenCount, tokenBalance)
        setGeneratedTokens(result.tokens)
        toast.success(`成功生成 ${result.tokens.length} 个 Token`)
      } catch {
        toast.error('生成失败')
      }
    })
  }

  const copyToken = async (tokenInfo: TokenInfo) => {
    await navigator.clipboard.writeText(tokenInfo.token)
    toast.success('已复制到剪贴板')
  }

  const copyUserToken = async (user: any) => {
    if (user.token) {
      await navigator.clipboard.writeText(user.token)
      toast.success(`已复制 ${user.username} 的 Token`)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Token 管理</h2>
        <div className="flex gap-3 items-center">
          <div className="flex items-center border rounded-md overflow-hidden">
            <Input
              type="number"
              value={tokenCount}
              onChange={(e) => setTokenCount(Number(e.target.value))}
              min={1}
              max={100}
              className="w-20 border-none focus:outline-none focus:ring-0"
            />
            <span className="px-3 bg-gray-100 text-gray-600 text-sm">个</span>
          </div>
          <div className="flex items-center border rounded-md overflow-hidden">
            <Input
              type="number"
              value={tokenBalance}
              onChange={(e) => setTokenBalance(Number(e.target.value))}
              min={1}
              max={10000}
              className="w-20 border-none focus:outline-none focus:ring-0"
            />
            <span className="px-3 bg-gray-100 text-gray-600 text-sm">余额</span>
          </div>
          <Button onClick={handleGenerate} disabled={isPending} variant="primary">
            {isPending ? '生成中...' : '生成 Token'}
          </Button>
        </div>
      </div>

      {generatedTokens.length > 0 && (
        <div className="bg-amber-50 rounded-lg p-5 border border-amber-200">
          <h3 className="text-sm font-medium text-amber-800 mb-3">新生成的 Token</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {generatedTokens.map((tokenInfo, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-white rounded">
                <code className="flex-1 text-sm truncate">{tokenInfo.token}</code>
                <Button
                  onClick={() => copyToken(tokenInfo)}
                  variant="ghost"
                  size="sm"
                >
                  复制
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户名</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Token</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">余额</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-amber-50 transition-colors">
                <td className="px-4 py-3">{user.username}</td>
                <td className="px-4 py-3">
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">{user.token}</code>
                </td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-amber-600">{user.balance}</span>
                </td>
                <td className="px-4 py-3">
                  <Button
                    onClick={() => copyUserToken(user)}
                    variant="ghost"
                    size="sm"
                  >
                    复制 Token
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
