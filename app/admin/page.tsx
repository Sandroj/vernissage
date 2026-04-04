import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ImportClient from './import-client'

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')
  return <ImportClient />
}
