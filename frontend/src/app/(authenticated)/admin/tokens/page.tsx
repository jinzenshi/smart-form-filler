import { getSimpleUsers } from '@/lib/server-api'
import { TokensTab } from '@/components/admin/tabs/TokensTab'
import { requireAdmin } from '@/lib/auth'

export default async function TokensPage() {
  await requireAdmin()
  const users = await getSimpleUsers()

  return <TokensTab initialUsers={users} />
}
