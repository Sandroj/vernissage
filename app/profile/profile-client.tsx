'use client'
import Link from 'next/link'
import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { CheckCircle2, ChevronDown, Eye, LogOut, Mail, Settings2, Sparkles, User } from 'lucide-react'
import { useTranslations, useFormatter } from 'next-intl'
import { proxyImg } from '@/lib/utils'
import Lightbox from '@/components/lightbox'

interface RecentSeen {
  id: number
  dateSeen: Date | string
  artwork: {
    id: number
    title: string
    image_local_path: string | null
    image_url: string | null
    artist: { name: string }
  }
}

interface ProfileClientProps {
  user: { id: string; name?: string | null; email: string; image?: string | null; seenPublic: boolean; createdAt: Date }
  seenCount: number
  seenByArtist: Array<{
    artist: { id: number; name: string; slug: string }
    artworks: Array<{ id: number; title: string; image_local_path: string | null; image_url: string | null }>
  }>
  recentSeen: RecentSeen[]
  myPhotos: Array<{ id: string; dateSeen: Date | string; photo_url: string; artwork: { id: number; title: string } }>
}

export default function ProfileClient({ user, seenCount, seenByArtist, recentSeen, myPhotos }: ProfileClientProps) {
  const [name, setName] = useState(user.name ?? '')
  const [seenPublic, setSeenPublic] = useState(user.seenPublic)
  const [saving, setSaving] = useState(false)
  const [openPhoto, setOpenPhoto] = useState<{ url: string; title: string; artworkId: number } | null>(null)
  const t = useTranslations('Profile')
  const fmt = useFormatter()

  async function saveProfile() {
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, seenPublic }),
    })
    setSaving(false)
    if (res.ok) toast.success(t('saved'))
    else toast.error(t('error'))
  }

  const initials = (user.name ?? user.email)
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  const memberSince = fmt.dateTime(new Date(user.createdAt), { month: 'long', year: 'numeric' })

  return (
    <div className="mx-auto max-w-5xl pb-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">{t('eyebrow')}</p>
          <h1 className="font-display text-5xl font-medium tracking-tight text-stone-900 sm:text-6xl">{t('title')}</h1>
          <p className="mt-3 text-sm text-stone-500">{t('memberSince', { date: memberSince })}</p>
        </div>
        <Button variant="outline" onClick={() => signOut({ callbackUrl: '/login' })} className="gap-2 rounded-full border-black/10 bg-white/60 text-stone-700 hover:bg-white">
          <LogOut size={14} /> {t('signOut')}
        </Button>
      </div>

      <section className="relative overflow-hidden rounded-[2rem] bg-[#25231f] p-6 text-white shadow-[0_24px_60px_rgba(68,52,30,.14)] sm:p-8">
        <div className="absolute -right-16 -top-24 size-64 rounded-full bg-[#5368df]/25 blur-3xl" />
        <div className="absolute -bottom-28 left-20 size-64 rounded-full bg-[#ed694c]/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-[1.5rem] bg-[#e7e9fa] text-2xl font-semibold text-[#4256cc] ring-4 ring-white/10">
              {user.image ? <img src={user.image} alt="" className="size-full object-cover" /> : initials}
            </div>
            <div>
              <p className="font-display text-3xl font-medium text-[#fffaf0]">{user.name ?? t('unknown')}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-white/55"><Mail size={13} /> {user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/65"><Sparkles size={15} className="text-[#f4b548]" /> {t('collectionHint')}</div>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-2">
        <StatCard icon={<CheckCircle2 size={16} />} value={seenCount} label={t('seenStat')} />
        <StatCard icon={<User size={16} />} value={memberSince} label={t('memberStat')} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="paper-card rounded-[1.75rem] p-5 sm:p-7">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div><p className="eyebrow mb-1">{t('recentEyebrow')}</p><h2 className="font-display text-3xl font-medium text-stone-900">{t('recentTitle')}</h2></div>
            {seenCount > 0 && <Link href="/artists" className="text-xs font-semibold text-[#4256cc] hover:underline">{t('browseMore')}</Link>}
          </div>
          {recentSeen.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl bg-black/[.025] px-6 text-center">
              <CheckCircle2 size={25} className="mb-3 text-stone-300" />
              <p className="text-sm font-medium text-stone-600">{t('recentEmpty')}</p>
              <Link href="/artists" className="mt-3 text-xs font-semibold text-[#4256cc] hover:underline">{t('discoverWorks')}</Link>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {recentSeen.map((item) => {
                const image = proxyImg(item.artwork.image_local_path ?? item.artwork.image_url)
                return <Link key={item.id} href={`/artworks/${item.artwork.id}`} className="group flex items-center gap-3 rounded-2xl p-2.5 transition hover:bg-black/[.035]">
                  <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-stone-200">
                    {image ? <img src={image} alt="" className="size-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="size-full bg-[#e7e1d6]" />}
                  </div>
                  <div className="min-w-0"><p className="line-clamp-2 font-display text-base font-semibold leading-tight text-stone-900 group-hover:text-[#4256cc]">{item.artwork.title}</p><p className="mt-1 truncate text-xs text-stone-500">{item.artwork.artist.name} · {fmt.dateTime(new Date(item.dateSeen), { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
                </Link>
              })}
            </div>
          )}
          {seenByArtist.length > 0 && (
            <details className="mt-6 border-t border-black/[.07] pt-5" open>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-stone-800 [&::-webkit-details-marker]:hidden">
                <span>{t('seenByArtist')}</span><ChevronDown size={16} className="text-stone-400 transition-transform [[open]>&]:rotate-180" />
              </summary>
              <div className="mt-3 divide-y divide-black/[.06]">
                {seenByArtist.map(({ artist, artworks }) => (
                  <details key={artist.id} className="group py-3 first:pt-1">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm [&::-webkit-details-marker]:hidden">
                      <span className="font-semibold text-stone-800">{artist.name}</span>
                      <span className="text-xs text-stone-400">{t('seenArtistCount', { count: artworks.length })} <ChevronDown size={14} className="ml-1 inline transition-transform group-open:rotate-180" /></span>
                    </summary>
                    <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                      {artworks.map((artwork) => {
                        const image = proxyImg(artwork.image_local_path ?? artwork.image_url)
                        return <li key={artwork.id}>
                          <Link href={`/artworks/${artwork.id}`} className="group flex min-w-0 items-center gap-2 rounded-xl p-1.5 transition hover:bg-black/[.035]">
                            <span className="size-16 shrink-0 overflow-hidden rounded-xl bg-stone-200">
                              {image ? <img src={image} alt="" className="size-full object-cover transition duration-300 group-hover:scale-105" /> : <span className="block size-full bg-[#e7e1d6]" />}
                            </span>
                            <span className="min-w-0 line-clamp-2 text-xs leading-tight text-[#4256cc] group-hover:underline">{artwork.title}</span>
                          </Link>
                        </li>
                      })}
                    </ul>
                  </details>
                ))}
              </div>
            </details>
          )}
        </section>

        <section className="paper-card rounded-[1.75rem] p-5 sm:p-7">
          <div className="mb-5 flex items-center gap-2"><Settings2 size={16} className="text-[#4256cc]" /><h2 className="font-display text-2xl font-medium text-stone-900">{t('settingsTitle')}</h2></div>
          <div className="space-y-5">
            <div className="space-y-1.5"><label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400"><User size={11} /> {t('name')}</label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('namePlaceholder')} className="h-11 rounded-xl border-black/10 bg-white/70 text-stone-900 placeholder:text-stone-400" /></div>
            <div className="space-y-1.5"><label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400"><Mail size={11} /> {t('email')}</label><Input value={user.email} disabled className="h-11 rounded-xl border-black/5 bg-black/[.035] text-stone-400" /></div>
            <div className="flex items-start justify-between gap-4 rounded-2xl bg-black/[.03] p-4"><div className="flex items-start gap-3"><Eye size={16} className="mt-0.5 shrink-0 text-stone-500" /><div><p className="text-sm font-semibold text-stone-800">{t('publicTitle')}</p><p className="mt-1 text-xs leading-relaxed text-stone-500">{t('publicText')}</p></div></div><Switch checked={seenPublic} onCheckedChange={setSeenPublic} className="shrink-0" /></div>
            <Button onClick={saveProfile} disabled={saving} className="h-11 w-full rounded-full bg-[#4256cc] text-white hover:bg-[#3447b8]">{saving ? t('saving') : t('save')}</Button>
          </div>
        </section>
      </div>

      {myPhotos.length > 0 && (
        <section className="paper-card mt-6 rounded-[1.75rem] p-5 sm:p-7">
          <div className="mb-5">
            <p className="eyebrow mb-1">{t('photosEyebrow')}</p>
            <h2 className="font-display text-3xl font-medium text-stone-900">{t('photosTitle')}</h2>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {myPhotos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setOpenPhoto({ url: photo.photo_url, title: photo.artwork.title, artworkId: photo.artwork.id })}
                className="aspect-square cursor-zoom-in overflow-hidden rounded-xl bg-stone-200 transition hover:opacity-90"
              >
                <img src={photo.photo_url} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        </section>
      )}

      {openPhoto && (
        <Lightbox
          src={openPhoto.url}
          alt={openPhoto.title}
          onClose={() => setOpenPhoto(null)}
          meta={{ title: openPhoto.title, artworkHref: `/artworks/${openPhoto.artworkId}` }}
        />
      )}
    </div>
  )
}

function StatCard({ icon, value, label, wide }: { icon: React.ReactNode; value: number | string; label: string; wide?: boolean }) {
  return <div className={`paper-card rounded-2xl p-4 ${wide ? 'col-span-2 sm:col-span-1' : ''}`}><div className="mb-2 flex items-center gap-2 text-[#4256cc]">{icon}<span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">{label}</span></div><p className="font-display text-2xl font-semibold text-stone-900">{value}</p></div>
}
