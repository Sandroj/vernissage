import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendNotificationEmail } from '@/lib/notifications'

const recentSubmissions = new Map<string, number[]>()
const HOUR = 60 * 60 * 1000

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  // Quietly accept bot submissions without storing or sending them.
  if (typeof body.website === 'string' && body.website.trim()) return NextResponse.json({ ok: true })

  const kind = body.kind
  const artistName = typeof body.artistName === 'string' ? body.artistName.trim().replace(/[\r\n]+/g, ' ').slice(0, 120) : ''
  const artworkTitle = typeof body.artworkTitle === 'string' ? body.artworkTitle.trim().replace(/[\r\n]+/g, ' ').slice(0, 240) : ''
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 3000) : ''
  const senderEmail = typeof body.senderEmail === 'string' ? body.senderEmail.trim().slice(0, 254) : ''
  const artworkId = Number.isInteger(Number(body.artworkId)) && Number(body.artworkId) > 0 ? Number(body.artworkId) : null

  if (!['missing_work', 'incorrect_listing'].includes(kind) || !artistName || !artworkTitle || !message) {
    return NextResponse.json({ error: 'Please include the artist, work title, and a short note.' }, { status: 400 })
  }
  if (senderEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const now = Date.now()
  const attempts = (recentSubmissions.get(ip) ?? []).filter((time) => now - time < HOUR)
  if (attempts.length >= 8) return NextResponse.json({ error: 'Please try again later.' }, { status: 429 })
  attempts.push(now)
  recentSubmissions.set(ip, attempts)

  const suggestion = await prisma.workSuggestion.create({
    data: { kind, artistName, artworkId, artworkTitle, message, senderEmail: senderEmail || null },
  })

  const subject = kind === 'missing_work'
    ? `Missing artwork suggested: ${artworkTitle} — ${artistName}`
    : `Artwork correction: ${artworkTitle} — ${artistName}`
  const email = await sendNotificationEmail({
    subject,
    text: [
      `Type: ${kind === 'missing_work' ? 'Missing artwork' : 'Incorrect listing'}`,
      `Artist: ${artistName}`,
      `Artwork: ${artworkTitle}`,
      artworkId ? `App record: https://arttracker-xi.vercel.app/artworks/${artworkId}` : null,
      senderEmail ? `Reply to: ${senderEmail}` : null,
      '',
      message,
      '',
      `Submission ID: ${suggestion.id}`,
    ].filter((line) => line !== null).join('\n'),
  })

  await prisma.workSuggestion.update({
    where: { id: suggestion.id },
    data: { emailSentAt: email.sent ? new Date() : null, emailError: email.error },
  })

  return NextResponse.json({ ok: true, id: suggestion.id, emailSent: email.sent, emailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.FEEDBACK_FROM_EMAIL), emailError: email.sent ? null : email.error }, { status: 201 })
}
