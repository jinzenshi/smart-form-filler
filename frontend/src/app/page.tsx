import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { WorkbenchPage } from '@/components/workbench/WorkbenchPage'

export default function HomePage() {
  const token = cookies().get('auth_token')?.value
  if (!token) {
    redirect('/login')
  }

  return <WorkbenchPage />
}
