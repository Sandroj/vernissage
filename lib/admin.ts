import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const configuredAdmins = (process.env.ADMIN_EMAILS ?? 's.regtuijt@gmail.com')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && configuredAdmins.includes(email.trim().toLowerCase())
}

export async function getAdminEmail(): Promise<string | null> {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.trim().toLowerCase()
  return email && configuredAdmins.includes(email) ? email : null
}
