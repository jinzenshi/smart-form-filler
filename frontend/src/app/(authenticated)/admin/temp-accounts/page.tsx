import { getTempAccounts } from '@/lib/server-api'
import { TempAccountsTab } from '@/components/admin/tabs/TempAccountsTab'
import { requireAdmin } from '@/lib/auth'

export default async function TempAccountsPage() {
  await requireAdmin()
  const accounts = await getTempAccounts(false)

  return <TempAccountsTab initialAccounts={accounts} />
}
