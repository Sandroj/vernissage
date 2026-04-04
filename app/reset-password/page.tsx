'use client'
import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center"><p className="text-slate-400">Laden...</p></div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resetUrl, setResetUrl] = useState('')
  const [loading, setLoading] = useState(false)

  // Formulier: nieuw wachtwoord instellen (met token)
  if (token) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Nieuw wachtwoord</h1>
            <p className="text-slate-400 mt-1 text-sm">Kies een nieuw wachtwoord voor je account</p>
          </div>

          {success ? (
            <div className="space-y-4">
              <p className="text-green-400 text-sm bg-green-950/30 px-3 py-2 rounded-lg">{success}</p>
              <Button className="w-full" onClick={() => router.push('/login')}>
                Naar inloggen
              </Button>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                setError('')
                if (password !== passwordConfirm) {
                  setError('Wachtwoorden komen niet overeen')
                  return
                }
                setLoading(true)
                const res = await fetch('/api/auth/reset-password', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ token, password }),
                })
                const data = await res.json()
                setLoading(false)
                if (!res.ok) {
                  setError(data.error ?? 'Er ging iets mis')
                } else {
                  setSuccess('Wachtwoord gewijzigd. Je kunt nu inloggen.')
                }
              }}
              className="space-y-3"
            >
              <Input
                type="password"
                placeholder="Nieuw wachtwoord"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-slate-900 border-slate-700"
              />
              <Input
                type="password"
                placeholder="Bevestig wachtwoord"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                minLength={6}
                className="bg-slate-900 border-slate-700"
              />
              {error && (
                <p className="text-red-400 text-sm bg-red-950/30 px-3 py-2 rounded-lg">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Bezig...' : 'Wachtwoord wijzigen'}
              </Button>
            </form>
          )}
        </div>
      </div>
    )
  }

  // Formulier: e-mail invoeren om reset aan te vragen
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Wachtwoord vergeten</h1>
          <p className="text-slate-400 mt-1 text-sm">Voer je e-mailadres in om je wachtwoord te resetten</p>
        </div>

        {success ? (
          <div className="space-y-4">
            <p className="text-green-400 text-sm bg-green-950/30 px-3 py-2 rounded-lg">{success}</p>
            {resetUrl && (
              <div className="space-y-2">
                <p className="text-slate-400 text-xs">Klik op de link hieronder om je wachtwoord te resetten:</p>
                <a
                  href={resetUrl}
                  className="text-indigo-400 hover:underline text-sm break-all block bg-slate-900 px-3 py-2 rounded-lg"
                >
                  Wachtwoord resetten
                </a>
              </div>
            )}
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              setError('')
              setLoading(true)
              const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
              })
              const data = await res.json()
              setLoading(false)
              if (!res.ok) {
                setError(data.error ?? 'Er ging iets mis')
              } else {
                setSuccess('Als dit e-mailadres bekend is, kun je hieronder je wachtwoord resetten.')
                if (data.resetUrl) setResetUrl(data.resetUrl)
              }
            }}
            className="space-y-3"
          >
            <Input
              type="email"
              placeholder="E-mailadres"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-slate-900 border-slate-700"
            />
            {error && (
              <p className="text-red-400 text-sm bg-red-950/30 px-3 py-2 rounded-lg">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Bezig...' : 'Wachtwoord resetten'}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-slate-400">
          <Link href="/login" className="text-indigo-400 hover:underline">
            Terug naar inloggen
          </Link>
        </p>
      </div>
    </div>
  )
}
