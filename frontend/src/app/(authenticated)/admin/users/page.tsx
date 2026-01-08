import { getUsers } from '@/lib/server-api'
import { UsersTab } from '@/components/admin/tabs/UsersTab'
import { requireAdmin } from '@/lib/auth'

export default async function UsersPage() {
  await requireAdmin()
  const users = await getUsers()

  return <UsersTab initialUsers={users} />
}
