'use client'
import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

interface ProfileClientProps {
  user: { id: string; name?: string | null; email: string; image?: string | null; seenPublic: boolean; createdAt: Date }
  seenCount: number
  hasPassword: boolean
}

export default function ProfileClient({ user, seenCount, hasPassword }: ProfileClientProps) {
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
    if (res.ok) toast('Profiel opgeslagen')
    else toast.error('Er ging iets mis')
  }

  return (
    <div className="max-w-md space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Profiel</h1>
        <p className="text-slate-400 text-sm">{seenCount} werken gezien</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs text-slate-400 uppercase tracking-wide">Naam</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-slate-900 border-slate-700"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-slate-400 uppercase tracking-wide">E-mail</label>
          <Input value={user.email} disabled className="bg-slate-900 border-slate-700 opacity-50" />
        </div>

        <div className="flex items-center justify-between bg-slate-900 rounded-lg p-4">
          <div>
            <p className="text-sm font-medium">Gezien-items openbaar</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Anderen kunnen zien hoeveel mensen een werk hebben gezien
            </p>
          </div>
          <Switch
            checked={seenPublic}
            onCheckedChange={setSeenPublic}
          />
        </div>

        <Button onClick={saveProfile} disabled={saving} className="w-full">
          {saving ? 'Opslaan...' : 'Profiel opslaan'}
        </Button>
      </div>

      <div className="pt-4 border-t border-slate-800">
        <Button
          variant="outline"
          className="w-full border-red-900 text-red-400 hover:bg-red-950"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          Uitloggen
        </Button>
      </div>
    </div>
  )
}
