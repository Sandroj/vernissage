import { redirect } from 'next/navigation'
import { getAdminEmail } from '@/lib/admin'
import { prisma } from '@/lib/prisma'
import AdminDashboard from './admin-dashboard'

export default async function AdminPage() {
  const email = await getAdminEmail()
  if (!email) redirect('/login?callbackUrl=%2Fadmin')

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      _count: { select: { seen: true } },
      entitlement: { select: { active: true, expiresAt: true } },
    },
  })

  return (
    <AdminDashboard
      users={users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
        entitlement: u.entitlement
          ? { active: u.entitlement.active, expiresAt: u.entitlement.expiresAt?.toISOString() ?? null }
          : null,
      }))}
    />
  )
}
