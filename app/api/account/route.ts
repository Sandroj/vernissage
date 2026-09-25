import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'
import { deletePhoto } from '@/lib/photo-storage'

// DELETE /api/account
// Verwijdert het account en alle bijbehorende gegevens definitief. Vereist
// het huidige wachtwoord als het account er een heeft (extra drempel tegen
// een open/gedeelde sessie); Google-only accounts hebben die drempel niet.
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  const userId = session.user.id

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } })
  if (!user) return NextResponse.json({ error: 'Account niet gevonden' }, { status: 404 })

  if (user.password) {
    const { password } = await req.json().catch(() => ({}))
    const ok = typeof password === 'string' && (await bcrypt.compare(password, user.password))
    if (!ok) return NextResponse.json({ error: 'Wachtwoord onjuist' }, { status: 403 })
  }

  // Lopend Stripe-abonnement direct opzeggen: account verwijderen stopt de
  // lokale billingrijen, maar niet vanzelf de facturering bij Stripe.
  const billingCustomer = await prisma.billingCustomer.findUnique({
    where: { userId },
    include: { subscriptions: { where: { status: { in: ['active', 'trialing', 'past_due'] } } } },
  })
  const stripe = getStripe()
  if (stripe && billingCustomer) {
    for (const sub of billingCustomer.subscriptions) {
      await stripe.subscriptions.cancel(sub.stripeSubscriptionId).catch((err) => {
        console.error('account delete: failed to cancel Stripe subscription', sub.stripeSubscriptionId, err)
      })
    }
  }

  const [seenPhotos, visitPhotos] = await Promise.all([
    prisma.seen.findMany({ where: { userId, photo_url: { not: null } }, select: { photo_url: true } }),
    prisma.visit.findMany({ where: { userId, photo_url: { not: null } }, select: { photo_url: true } }),
  ])
  const photoKeys = new Set(
    [...seenPhotos, ...visitPhotos].map((p) => p.photo_url).filter((key): key is string => !!key)
  )
  await Promise.all(Array.from(photoKeys).map((key) => deletePhoto(key)))

  // Expliciete deletes i.p.v. vertrouwen op schema-cascade: SQLite/libSQL
  // handhaaft FK-cascades alleen als foreign_keys-pragma aanstaat, en dit is
  // een onomkeerbare bewerking op productiedata — geen aanname waard.
  await prisma.$transaction([
    prisma.seen.deleteMany({ where: { userId } }),
    prisma.visit.deleteMany({ where: { userId } }),
    prisma.wantToSee.deleteMany({ where: { userId } }),
    prisma.artistVote.deleteMany({ where: { userId } }),
    prisma.report.deleteMany({ where: { userId } }),
    prisma.session.deleteMany({ where: { userId } }),
    prisma.account.deleteMany({ where: { userId } }),
    prisma.entitlement.deleteMany({ where: { userId } }),
    prisma.subscription.deleteMany({ where: { billingCustomer: { userId } } }),
    prisma.billingCustomer.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ])

  return NextResponse.json({ ok: true })
}
