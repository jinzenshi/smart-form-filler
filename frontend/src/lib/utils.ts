import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// 数据库存储的是 UTC 时间，需要加 9 小时 12 分钟才是中国时间
const CHINA_OFFSET_MINUTES = 9 * 60 + 12

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-'

  const date = new Date(dateStr)
  date.setMinutes(date.getMinutes() + CHINA_OFFSET_MINUTES)

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function getFileTypeName(type: string): string {
  const types: Record<string, string> = {
    docx: 'DOCX文档',
    user_info: '个人信息',
    screenshot: '反馈截图'
  }
  return types[type] || type
}

export function getFileTypeBadge(type: string): string {
  const badges: Record<string, string> = {
    docx: 'badge-blue',
    user_info: 'badge-green',
    screenshot: 'badge-purple'
  }
  return badges[type] || ''
}

export function getFeedbackTypeName(type: string): string {
  const types: Record<string, string> = {
    suggestion: '功能建议',
    bug: 'Bug报告',
    ux: '用户体验',
    performance: '性能问题',
    other: '其他'
  }
  return types[type] || type
}

export function getFeedbackStatusName(status: string): string {
  const statuses: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已解决',
    closed: '已关闭'
  }
  return statuses[status] || status
}

export function getFeedbackStatusBadge(status: string): string {
  const badges: Record<string, string> = {
    pending: 'badge-yellow',
    processing: 'badge-blue',
    resolved: 'badge-green',
    closed: 'badge-gray'
  }
  return badges[status] || ''
}
