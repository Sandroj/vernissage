'use client'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import LocaleToggle from '@/components/locale-toggle'
import GlobalSearch from '@/components/global-search'
import { Logo } from '@/components/logo'

export default function Nav() {
  const { data: session } = useSession()
  const pathname = usePathname() ?? ''
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const t = useTranslations('Nav')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = [
    { href: '/artists', label: t('artists') },
    { href: '/museums', label: t('museums') },
    { href: '/nearby', label: t('nearby') },
    { href: '/discover', label: t('discover') },
    ...(session ? [{ href: '/profile', label: t('profile') }] : []),
  ]

  return (
    <div className="sticky top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <nav
        className={cn(
          'mx-auto flex h-16 max-w-6xl items-center justify-between gap-5 rounded-full border px-4 backdrop-blur-2xl transition-all duration-300 motion-reduce:transition-none sm:px-6',
          scrolled
            ? 'border-black/[0.08] bg-[#f8f3e9]/92 shadow-[0_12px_36px_-10px_rgba(67,51,29,.3)]'
            : 'border-white/30 bg-[#f8f3e9]/45 shadow-[0_2px_16px_-6px_rgba(67,51,29,.1)]'
        )}
      >
        <Link href="/" className="text-stone-950 transition-opacity hover:opacity-70">
          <Logo size={32} />
        </Link>

        <GlobalSearch />

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                pathname.startsWith(l.href)
                  ? 'text-[#4256cc] bg-[#e6e8fb]'
                  : 'text-stone-600 hover:text-stone-950 hover:bg-black/5'
              )}
            >
              {l.label}
            </Link>
          ))}
          {session ? (
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="ml-1 px-3 py-2 rounded-full text-sm text-stone-500 whitespace-nowrap hover:text-stone-950 hover:bg-black/5 transition-colors"
            >
              {t('signOut')}
            </button>
          ) : (
            <Link href="/login" className="ml-2">
              <Button size="sm" className="h-9 rounded-full bg-[#4256cc] px-4 text-white hover:bg-[#3447b8]">
                {t('signIn')}
              </Button>
            </Link>
          )}
          <LocaleToggle className="ml-3" />
        </div>

        <div className="md:hidden flex items-center gap-2">
          <GlobalSearch compact />
          <LocaleToggle />
          <button className="grid size-9 place-items-center rounded-full border border-black/10 bg-white/70 text-stone-700" onClick={() => setOpen(!open)} aria-label={t('menu')}>
          {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="mx-auto mt-2 max-w-6xl md:hidden">
          <div className="flex flex-col gap-1 rounded-3xl border border-black/[0.08] bg-[#f8f3e9]/97 px-4 py-3 shadow-[0_12px_36px_-10px_rgba(67,51,29,.3)] backdrop-blur-2xl">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'px-3 py-2 rounded-xl text-sm transition-colors',
                  pathname.startsWith(l.href)
                    ? 'text-[#4256cc] bg-[#e6e8fb]'
                    : 'text-stone-700 hover:text-stone-950 hover:bg-black/5'
                )}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            {session ? (
              <button
                className="px-3 py-2 rounded-xl text-sm text-stone-500 text-left hover:text-stone-950"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                {t('signOut')}
              </button>
            ) : (
              <Link href="/login" className="px-3 py-2 text-sm text-[#4256cc]" onClick={() => setOpen(false)}>
                {t('signIn')}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
