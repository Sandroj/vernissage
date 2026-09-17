import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { sendNotificationEmail } from '@/lib/notifications'
import { hashResetToken, shouldExposeResetUrl } from '@/lib/reset-token'
import crypto from 'crypto'

// POST /api/auth/reset-password
// Stap 1: Vraag reset-token aan (body: { email })
// Stap 2: Reset wachtwoord met token (body: { token, password })
export async function POST(req: Request) {
  const body = await req.json()

  // Stap 2: wachtwoord resetten met token
  if (body.token && body.password) {
    if (body.password.length < 6) {
      return NextResponse.json({ error: 'Wachtwoord moet minimaal 6 tekens zijn' }, { status: 400 })
    }

    const hashedToken = hashResetToken(body.token)
    const record = await prisma.verificationToken.findFirst({
      where: { token: hashedToken },
    })

    if (!record || record.expires < new Date()) {
      return NextResponse.json({ error: 'Ongeldige of verlopen link' }, { status: 400 })
    }

    // Token meteen verbruiken, vóór de wachtwoordwijziging, zodat hij niet
    // opnieuw te gebruiken is bij een gelijktijdige tweede aanvraag.
    // ponytail: geen DB-lock, dus geen harde garantie bij gelijktijdige requests — voldoende voor huidige schaal
    await prisma.verificationToken.deleteMany({
      where: { identifier: record.identifier },
    })

    const hashed = await bcrypt.hash(body.password, 12)
    await prisma.user.update({
      where: { email: record.identifier },
      data: { password: hashed, passwordChangedAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  }

  // Stap 1: genereer reset-token
  if (body.email) {
    const user = await prisma.user.findUnique({ where: { email: body.email } })
    if (user) {
      // Verwijder oude tokens voor deze gebruiker
      await prisma.verificationToken.deleteMany({
        where: { identifier: user.email },
      })

      const rawToken = crypto.randomBytes(32).toString('hex')
      const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 uur geldig

      await prisma.verificationToken.create({
        data: {
          identifier: user.email,
          token: hashResetToken(rawToken),
          expires,
        },
      })

      const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
      const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`

      const { sent, error } = await sendNotificationEmail({
        to: user.email,
        subject: 'Wachtwoord resetten voor Pinacot',
        text: `Klik op deze link om je wachtwoord te resetten (1 uur geldig):\n${resetUrl}\n\nHeb je dit niet aangevraagd? Negeer dit bericht.`,
      })
      if (!sent) {
        console.error('Reset-mail kon niet worden verstuurd:', error)
      }

      // Alleen buiten productie de link teruggeven, voor lokaal/preview testen
      // zonder mailprovider. In productie moet de echte mail dit dragen.
      if (shouldExposeResetUrl(process.env.NODE_ENV)) {
        return NextResponse.json({ ok: true, resetUrl })
      }
    }
    // Geen foutmelding tonen (security) — doe alsof het gelukt is, ongeacht
    // of het account bestaat of de mail daadwerkelijk is verstuurd.
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'E-mailadres is verplicht' }, { status: 400 })
}
