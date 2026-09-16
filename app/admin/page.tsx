import { redirect } from 'next/navigation'
import ImportClient from './import-client'
import { getAdminEmail } from '@/lib/admin'
import ArtworkEditor from './artwork-editor'

export default async function AdminPage() {
  const email = await getAdminEmail()
  if (!email) redirect('/login?callbackUrl=%2Fadmin')
  return <><ImportClient /><ArtworkEditor /></>
}
