type NotificationEmail = { subject: string; text: string }

export async function sendNotificationEmail({ subject, text }: NotificationEmail) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.FEEDBACK_FROM_EMAIL
  const to = process.env.FEEDBACK_TO_EMAIL ?? process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 's.regtuijt@gmail.com'

  if (!apiKey || !from) return { sent: false, error: 'Email delivery is not configured.' }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text }),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      let message = ''
      try {
        const parsed = JSON.parse(detail) as { message?: string; name?: string }
        message = parsed.message ?? parsed.name ?? ''
      } catch { /* provider returned non-JSON */ }
      return { sent: false, error: `Email provider returned ${response.status}${message ? `: ${message}` : '.'}`.slice(0, 500) }
    }
    return { sent: true, error: null }
  } catch {
    return { sent: false, error: 'Could not reach the email provider.' }
  }
}
