'use client'
import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { User, Mail, Eye, LogOut, CheckCircle2 } from 'lucide-react'

interface ProfileClientProps {
  user: { id: string; name?: string | null; email: string; image?: string | null; seenPublic: boolean; createdAt: Date }
  seenCount: number
  hasPassword: boolean
}

export default function ProfileClient({ user, seenCount }: ProfileClientProps) {
  const [name, setName] = useState(user.name ?? '')
  const [seenPublic, setSeenPublic] = useState(user.seenPublic)
  const [saving, setSaving] = useState(false)

  async function saveProfile() {
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, seenPublic }),
    })
    setSaving(false)
    if (res.ok) toast.success('Profiel opgeslagen')
    else toast.error('Er ging iets mis')
  }

  const initials = (user.name ?? user.email)
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const memberSince = new Date(user.createdAt).toLocaleDateString('nl-NL', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="max-w-lg">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Profiel</h1>
        <p className="text-zinc-500 text-sm">Lid sinds {memberSince}</p>
      </div>

      {/* Avatar + stat */}
      <div className="flex items-center gap-4 mb-8 p-5 bg-zinc-900 rounded-2xl border border-white/5">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
          {user.image ? (
            <img src={user.image} alt={user.name ?? ''} className="w-full h-full rounded-2xl object-cover" />
          ) : (
            <span className="text-xl font-bold text-indigo-300">{initials}</span>
          )}
        </div>
        <div>
          <p className="font-semibold text-white text-lg">{user.name ?? 'Onbekend'}</p>
          <p className="text-zinc-500 text-sm">{user.email}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <CheckCircle2 size={13} className="text-indigo-400" />
            <span className="text-indigo-400 text-sm font-medium">{seenCount} werken gezien</span>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-5">
        {/* Naam */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium uppercase tracking-wider">
            <User size={11} /> Naam
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jouw naam"
            className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:ring-indigo-500/20"
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium uppercase tracking-wider">
            <Mail size={11} /> E-mail
          </label>
          <Input
            value={user.email}
            disabled
            className="bg-zinc-900/50 border-white/5 text-zinc-500 cursor-not-allowed"
          />
        </div>

        {/* Privacy toggle */}
        <div className="flex items-center justify-between bg-zinc-900 rounded-xl p-4 border border-white/5">
          <div className="flex items-start gap-3">
            <Eye size={16} className="text-zinc-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-white">Gezien-items openbaar</p>
              <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                Anderen kunnen zien hoeveel mensen een werk hebben gezien
              </p>
            </div>
          </div>
          <Switch
            checked={seenPublic}
            onCheckedChange={setSeenPublic}
            className="ml-4 flex-shrink-0"
          />
        </div>

        {/* Save button */}
        <Button
          onClick={saveProfile}
          disabled={saving}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white border-0 h-11"
        >
          {saving ? 'Opslaan...' : 'Profiel opslaan'}
        </Button>
      </div>

      {/* Uitloggen */}
      <div className="mt-8 pt-6 border-t border-white/5">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm text-red-400 border border-red-900/40 hover:bg-red-950/30 transition-colors"
        >
          <LogOut size={14} /> Uitloggen
        </button>
      </div>
    </div>
  )
}
