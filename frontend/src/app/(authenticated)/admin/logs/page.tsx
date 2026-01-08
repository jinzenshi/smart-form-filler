import { getLogs } from '@/lib/server-api'
import { LogsTab } from '@/components/admin/tabs/LogsTab'
import { requireAdmin } from '@/lib/auth'

export default async function LogsPage() {
  await requireAdmin()
  const logs = await getLogs()

  return <LogsTab initialLogs={logs} />
}
