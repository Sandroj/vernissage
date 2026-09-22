'use client'
import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslations } from 'next-intl'
import { LogoMark } from '@/components/logo'

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const t = useTranslations('Login')
  const appleSignInEnabled = process.env.NEXT_PUBLIC_ENABLE_APPLE_SIGN_IN === 'true'
  const authError = params.get('error')
  const [mode, setMode] = useState<'login' | 'register'>(params.get('mode') === 'register' ? 'register' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState(authError ? t.has(`authErrors.${authError}`) ? t(`authErrors.${authError}`) : t('authErrors.Default') : '')
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
          setError(t('errAlreadyRegistered'))
          return
        }

        setError(data.error ?? t('errRegisterFailed'))
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
        setError(t('errCreatedButLogin'))
        setMode('login')
      } else {
        setError(t('errInvalid'))
      }
    } else {
      router.push(mode === 'register' ? '/discover?intro=1' : '/')
      router.refresh()
    }
  }

  return (
    <div className="relative flex min-h-[75vh] items-center justify-center overflow-hidden">
      <div className="pointer-events-none absolute -left-24 top-10 size-72 rounded-full bg-[#5368df]/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 size-72 rounded-full bg-[#ed694c]/20 blur-3xl" />

      <div className="paper-card relative w-full max-w-sm space-y-6 rounded-[1.75rem] p-8 sm:p-10">
        <div className="text-center">
          <LogoMark size={44} className="mx-auto mb-4" />
          <h1 className="font-display text-3xl font-medium text-stone-900">Seen</h1>
          <p className="mt-1.5 text-sm text-stone-500">
            {mode === 'login' ? t('signInSubtitle') : t('registerSubtitle')}
          </p>
        </div>

        {appleSignInEnabled && (
          <Button
            className="h-11 w-full gap-2 rounded-full bg-black text-white hover:bg-stone-800"
            onClick={() => signIn('apple', { callbackUrl: '/' })}
            type="button"
          >
            {t('apple')}
          </Button>
        )}

        <Button
          className="h-11 w-full gap-2 rounded-full border-black/10 bg-white/70 text-stone-800 hover:bg-white"
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
          {t('google')}
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-black/10" />
          <span className="text-xs text-stone-400">{t('or')}</span>
          <div className="flex-1 h-px bg-black/10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <Input
              placeholder={t('namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-xl border-black/10 bg-white/70 text-stone-900 placeholder:text-stone-400"
            />
          )}
          <Input
            type="email"
            placeholder={t('emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11 rounded-xl border-black/10 bg-white/70 text-stone-900 placeholder:text-stone-400"
          />
          <Input
            type="password"
            placeholder={t('passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="h-11 rounded-xl border-black/10 bg-white/70 text-stone-900 placeholder:text-stone-400"
          />
          {error && (
            <p className={`text-sm px-3 py-2 rounded-lg ${error === t('errAlreadyRegistered') ? 'text-amber-700 bg-amber-100/70' : 'text-red-700 bg-red-100/70'}`}>
              {error}
            </p>
          )}
          <Button type="submit" className="h-11 w-full rounded-full bg-[#4256cc] text-white hover:bg-[#3447b8]" disabled={loading}>
            {loading ? t('busy') : mode === 'login' ? t('signIn') : t('register')}
          </Button>
        </form>

        <div className="space-y-2 text-center">
          <p className="text-sm text-stone-500">
            {mode === 'login' ? t('noAccount') : t('haveAccount')}{' '}
            <button
              type="button"
              className="text-[#4256cc] hover:underline"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            >
              {mode === 'login' ? t('registerHere') : t('signIn')}
            </button>
          </p>
          {mode === 'login' && (
            <p className="text-sm">
              <a href="/reset-password" className="text-stone-400 hover:text-stone-600 hover:underline">
                {t('forgot')}
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
