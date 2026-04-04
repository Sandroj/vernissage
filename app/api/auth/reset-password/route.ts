import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
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

    const record = await prisma.verificationToken.findFirst({
      where: { token: body.token },
    })

    if (!record || record.expires < new Date()) {
      return NextResponse.json({ error: 'Ongeldige of verlopen link' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(body.password, 12)
    await prisma.user.update({
      where: { email: record.identifier },
      data: { password: hashed },
    })

    // Verwijder gebruikte token
    await prisma.verificationToken.deleteMany({
      where: { identifier: record.identifier },
    })

    return NextResponse.json({ ok: true })
  }

  // Stap 1: genereer reset-token
  if (body.email) {
    const user = await prisma.user.findUnique({ where: { email: body.email } })
    if (!user) {
      // Geen foutmelding tonen (security) — doe alsof het gelukt is
      return NextResponse.json({ ok: true })
    }

    // Verwijder oude tokens voor deze gebruiker
    await prisma.verificationToken.deleteMany({
      where: { identifier: user.email },
    })

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 uur geldig

    await prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token,
        expires,
      },
    })

    // In een productie-omgeving zou je hier een e-mail sturen.
    // Voor nu: toon de reset-link direct (alleen in development/demo)
    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const resetUrl = `${baseUrl}/reset-password?token=${token}`

    return NextResponse.json({ ok: true, resetUrl })
  }

  return NextResponse.json({ error: 'E-mailadres is verplicht' }, { status: 400 })
}
