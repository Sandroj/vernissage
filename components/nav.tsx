'use client'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'

export default function Nav() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)

  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/artists', label: 'Kunstenaars' },
    { href: '/discover', label: 'Ontdekken' },
    ...(session ? [{ href: '/profile', label: 'Profiel' }] : []),
  ]

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-white text-lg">
          ArtTracker
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-slate-400 hover:text-white text-sm transition-colors">
              {l.label}
            </Link>
          ))}
          {session ? (
            <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-slate-400 hover:text-white">
              Uitloggen
            </Button>
          ) : (
            <Link href="/login">
              <Button size="sm">Inloggen</Button>
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 py-3 flex flex-col gap-3">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-slate-300 text-sm py-1" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          {session ? (
            <button className="text-slate-400 text-sm text-left py-1"
              onClick={() => signOut({ callbackUrl: '/login' })}>
              Uitloggen
            </button>
          ) : (
            <Link href="/login" className="text-indigo-400 text-sm py-1" onClick={() => setOpen(false)}>
              Inloggen
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
