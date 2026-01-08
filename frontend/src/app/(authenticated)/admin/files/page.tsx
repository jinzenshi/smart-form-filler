import { getFiles } from '@/lib/server-api'
import { FilesTab } from '@/components/admin/tabs/FilesTab'
import { requireAdmin } from '@/lib/auth'

export default async function FilesPage() {
  await requireAdmin()
  const files = await getFiles()

  return <FilesTab initialFiles={files} />
}
