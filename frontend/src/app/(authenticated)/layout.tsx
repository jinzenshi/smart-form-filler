import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default function AuthenticatedLayout({
  children
}: {
  children: React.ReactNode
}) {
  const token = cookies().get('auth_token')?.value

  if (!token) {
    redirect('/login')
  }

  return <>{children}</>
}
