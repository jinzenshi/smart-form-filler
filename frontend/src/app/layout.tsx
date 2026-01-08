import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '智能填表助手 - AI驱动的文档自动化系统',
  description: '高效、准确的智能填表工具'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
