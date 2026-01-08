import { AdminAuthProvider } from '@/components/admin/AdminAuthProvider'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { AdminTabs } from '@/components/admin/AdminTabs'
import { ToastProvider } from '@/components/common/Toast'

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <ToastProvider>
      <AdminAuthProvider>
        <div className="admin-layout">
          <AdminHeader username="管理员" />
          <main className="admin-main">
            <AdminTabs />
            <div className="admin-content">{children}</div>
          </main>
        </div>
      </AdminAuthProvider>
    </ToastProvider>
  )
}
