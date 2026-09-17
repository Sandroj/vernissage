import crypto from 'crypto'

export function hashResetToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}

// Alleen buiten productie mag de reset-link direct in de API-response terug,
// zodat lokaal/preview testen zonder mailprovider blijft werken.
export function shouldExposeResetUrl(nodeEnv: string | undefined): boolean {
  return nodeEnv !== 'production'
}
