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
    if (!response.ok) return { sent: false, error: `Email provider returned ${response.status}.` }
    return { sent: true, error: null }
  } catch {
    return { sent: false, error: 'Could not reach the email provider.' }
  }
}
