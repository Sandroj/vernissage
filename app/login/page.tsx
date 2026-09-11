'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (mode === 'register') {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        setLoading(false)

        // Als email al in gebruik: switch automatisch naar login mode
        if (res.status === 409) {
          setMode('login')
          setError('Dit e-mailadres is al geregistreerd. Log in met je wachtwoord.')
          return
        }

        setError(data.error ?? 'Registratie mislukt')
        return
      }
    }

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      if (mode === 'register') {
        setError('Account aangemaakt maar inloggen mislukt. Probeer in te loggen.')
        setMode('login')
      } else {
        setError('Onjuist e-mailadres of wachtwoord')
      }
    } else {
      router.push(mode === 'register' ? '/discover' : '/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Vernissage</h1>
          <p className="text-slate-400 mt-1 text-sm">
            {mode === 'login' ? 'Inloggen op je account' : 'Nieuw account aanmaken'}
          </p>
        </div>

        <Button
          className="w-full gap-2"
          variant="outline"
          onClick={() => signIn('google', { callbackUrl: '/' })}
          type="button"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Doorgaan met Google
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-slate-500 text-xs">of</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <Input
              placeholder="Naam (optioneel)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-900 border-slate-700"
            />
          )}
          <Input
            type="email"
            placeholder="E-mailadres"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-slate-900 border-slate-700"
          />
          <Input
            type="password"
            placeholder="Wachtwoord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="bg-slate-900 border-slate-700"
          />
          {error && (
            <p className={`text-sm px-3 py-2 rounded-lg ${error.includes('geregistreerd') ? 'text-amber-400 bg-amber-950/30' : 'text-red-400 bg-red-950/30'}`}>
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Bezig...' : mode === 'login' ? 'Inloggen' : 'Account aanmaken'}
          </Button>
        </form>

        <div className="text-center space-y-2">
          <p className="text-sm text-slate-400">
            {mode === 'login' ? 'Nog geen account?' : 'Al een account?'}{' '}
            <button
              type="button"
              className="text-indigo-400 hover:underline"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            >
              {mode === 'login' ? 'Registreer hier' : 'Inloggen'}
            </button>
          </p>
          {mode === 'login' && (
            <p className="text-sm">
              <a href="/reset-password" className="text-slate-500 hover:text-slate-300 hover:underline">
                Wachtwoord vergeten?
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
