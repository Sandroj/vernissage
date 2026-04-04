'use client'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Menu, X, Palette } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Nav() {
  const { data: session } = useSession()
  const pathname = usePathname() ?? ''
  const [open, setOpen] = useState(false)

  const links = [
    { href: '/artists', label: 'Kunstenaars' },
    { href: '/discover', label: 'Ontdekken' },
    ...(session ? [{ href: '/profile', label: 'Profiel' }] : []),
  ]

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.06] backdrop-blur-xl bg-[#09090b]/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-white hover:opacity-80 transition-opacity">
          <Palette size={18} className="text-indigo-400" />
          <span>ArtTracker</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm transition-colors',
                pathname.startsWith(l.href)
                  ? 'text-white bg-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}
            >
              {l.label}
            </Link>
          ))}
          {session ? (
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="ml-2 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Uitloggen
            </button>
          ) : (
            <Link href="/login" className="ml-2">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white border-0">
                Inloggen
              </Button>
            </Link>
          )}
        </div>

        <button className="md:hidden text-slate-400 hover:text-white p-1" onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/[0.06] px-4 py-3 flex flex-col gap-1 bg-[#09090b]">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'px-3 py-2 rounded-lg text-sm transition-colors',
                pathname.startsWith(l.href)
                  ? 'text-white bg-white/10'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              )}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          {session ? (
            <button
              className="px-3 py-2 rounded-lg text-sm text-slate-400 text-left hover:text-white"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              Uitloggen
            </button>
          ) : (
            <Link href="/login" className="px-3 py-2 text-sm text-indigo-400" onClick={() => setOpen(false)}>
              Inloggen
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
