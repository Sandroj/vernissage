import { redirect } from 'next/navigation'
import { getAdminEmail } from '@/lib/admin'
import AdminDashboard from './admin-dashboard'

export default async function AdminPage() {
  const email = await getAdminEmail()
  if (!email) redirect('/login?callbackUrl=%2Fadmin')
  return <AdminDashboard />
}
