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
      <div className="admin-layout">
        <AdminHeader username={username || '管理员'} />
        <main className="admin-main">
          <AdminTabs />
          <div className="admin-content">{children}</div>
        </main>
      </div>
    </ToastProvider>
  )
}
