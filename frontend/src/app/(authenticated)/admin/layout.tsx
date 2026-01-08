import { AdminHeader } from '@/components/admin/AdminHeader'
import { AdminTabs } from '@/components/admin/AdminTabs'
import { ToastProvider } from '@/components/common/Toast'
import { getCurrentUser } from '@/lib/auth'

export default function AdminLayout({
  children
}: {
  children: React.ReactNode
}) {
  const { username } = getCurrentUser()

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50">
        <AdminHeader username={username || '管理员'} />
        <main className="max-w-7xl mx-auto px-6">
          <AdminTabs />
          <div className="mt-6 pb-6">{children}</div>
        </main>
      </div>
    </ToastProvider>
  )
}
