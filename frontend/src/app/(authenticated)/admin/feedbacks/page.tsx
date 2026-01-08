import { getFeedbacks } from '@/lib/server-api'
import { FeedbacksTab } from '@/components/admin/tabs/FeedbacksTab'
import { requireAdmin } from '@/lib/auth'

export default async function FeedbacksPage() {
  await requireAdmin()
  const feedbacks = await getFeedbacks()

  return <FeedbacksTab initialFeedbacks={feedbacks} />
}
