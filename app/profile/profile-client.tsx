'use client'
import Link from 'next/link'
import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Bookmark, CheckCircle2, ChevronDown, Download, Eye, LogOut, Mail, Settings2, Sparkles, Trash2, User } from 'lucide-react'
import { useTranslations, useFormatter } from 'next-intl'
import Image from 'next/image'
import Lightbox from '@/components/lightbox'
import type { Bar } from '@/lib/taste-profile'

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
  user: { id: string; name?: string | null; email: string; image?: string | null; seenPublic: boolean; createdAt: Date; hasPassword: boolean }
  seenCount: number
  seenByArtist: Array<{
    artist: { id: number; name: string; slug: string }
    artworks: Array<{ id: number; title: string; image_local_path: string | null; image_url: string | null }>
  }>
  recentSeen: RecentSeen[]
  myPhotos: Array<{ id: string; dateSeen: Date | string; photo_url: string; artwork: { id: number; title: string } }>
  taste: { artists: Bar[]; museums: Bar[]; decades: Bar[]; years: Bar[] } | null
  wishlist: Array<{ id: number; artwork: { id: number; title: string; image_local_path: string | null; image_url: string | null; artist: { name: string }; museum: { name: string; city: string } | null } }>
}

export default function ProfileClient({ user, seenCount, seenByArtist, recentSeen, myPhotos, taste, wishlist }: ProfileClientProps) {
  const [name, setName] = useState(user.name ?? '')
  const [seenPublic, setSeenPublic] = useState(user.seenPublic)
  const [saving, setSaving] = useState(false)
  const [openPhoto, setOpenPhoto] = useState<{ url: string; title: string; artworkId: number } | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const t = useTranslations('Profile')
  const fmt = useFormatter()
  const { update: updateSession } = useSession()

  async function saveProfile() {
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, seenPublic }),
    })
    setSaving(false)
    if (res.ok) {
      await updateSession({ name })
      toast.success(t('saved'))
    } else {
      toast.error(t('error'))
    }
  }

  async function deleteAccount() {
    setDeleting(true)
    const res = await fetch('/api/account', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: deletePassword }),
    })
    if (res.ok) {
      await signOut({ callbackUrl: '/' })
      return
    }
    setDeleting(false)
    const body = await res.json().catch(() => ({}))
    toast.error(body.error ?? t('error'))
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
                const image = item.artwork.image_local_path ?? item.artwork.image_url
                return <Link key={item.id} href={`/artworks/${item.artwork.id}`} className="group flex items-center gap-3 rounded-2xl p-2.5 transition hover:bg-black/[.035]">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-stone-200">
                    {image ? <Image src={image} alt="" fill sizes="64px" className="object-cover transition duration-500 group-hover:scale-105" /> : <div className="size-full bg-[#e7e1d6]" />}
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
                        const image = artwork.image_local_path ?? artwork.image_url
                        return <li key={artwork.id}>
                          <Link href={`/artworks/${artwork.id}`} className="group flex min-w-0 items-center gap-2 rounded-xl p-1.5 transition hover:bg-black/[.035]">
                            <span className="relative block size-16 shrink-0 overflow-hidden rounded-xl bg-stone-200">
                              {image ? <Image src={image} alt="" fill sizes="64px" className="object-cover transition duration-300 group-hover:scale-105" /> : <span className="block size-full bg-[#e7e1d6]" />}
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

      {taste && (
        <section className="paper-card mt-6 rounded-[1.75rem] p-5 sm:p-7">
          <div className="mb-5"><p className="eyebrow mb-1">{t('tasteEyebrow')}</p><h2 className="font-display text-3xl font-medium text-stone-900">{t('tasteTitle')}</h2></div>
          <div className="grid gap-6 sm:grid-cols-2">
            <Bars title={t('tasteArtists')} bars={taste.artists} />
            <Bars title={t('tasteMuseums')} bars={taste.museums} />
            <Bars title={t('tasteDecades')} bars={taste.decades} />
            <Bars title={t('tasteYears')} bars={taste.years} />
          </div>
        </section>
      )}

      <section className="paper-card mt-6 rounded-[1.75rem] p-5 sm:p-7">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div><p className="eyebrow mb-1">{t('wishlistEyebrow')}</p><h2 className="font-display text-3xl font-medium text-stone-900">{t('wishlistTitle')}</h2></div>
          <span className="text-xs text-stone-400">{t('wishlistPrivate')}</span>
        </div>
        {wishlist.length === 0 ? (
          <div className="flex min-h-32 flex-col items-center justify-center rounded-2xl bg-black/[.025] px-6 text-center">
            <Bookmark size={22} className="mb-3 text-stone-300" />
            <p className="text-sm text-stone-600">{t('wishlistEmpty')}</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {wishlist.map(({ id, artwork }) => {
              const image = artwork.image_local_path ?? artwork.image_url
              return <Link key={id} href={`/artworks/${artwork.id}`} className="group flex items-center gap-3 rounded-2xl p-2.5 transition hover:bg-black/[.035]">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-stone-200">
                  {image ? <Image src={image} alt="" fill sizes="64px" className="object-cover transition duration-500 group-hover:scale-105" /> : <div className="size-full bg-[#e7e1d6]" />}
                </div>
                <div className="min-w-0"><p className="line-clamp-2 font-display text-base font-semibold leading-tight text-stone-900 group-hover:text-[#4256cc]">{artwork.title}</p><p className="mt-1 truncate text-xs text-stone-500">{artwork.artist.name}{artwork.museum && ` · ${artwork.museum.name}, ${artwork.museum.city}`}</p></div>
              </Link>
            })}
          </div>
        )}
      </section>

      <section className="paper-card mt-6 rounded-[1.75rem] p-5 sm:p-7">
        <div className="mb-5 flex items-center gap-2"><User size={16} className="text-[#4256cc]" /><h2 className="font-display text-2xl font-medium text-stone-900">{t('dataTitle')}</h2></div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-800">{t('exportTitle')}</p>
            <p className="mt-1 text-xs leading-relaxed text-stone-500">{t('exportText')}</p>
          </div>
          <a
            href="/api/account/export"
            download
            className={buttonVariants({ variant: 'outline', className: 'gap-2 rounded-full border-black/10 bg-white/60 text-stone-700 hover:bg-white' })}
          >
            <Download size={14} /> {t('exportButton')}
          </a>
        </div>
        <div className="mt-5 flex flex-col gap-3 border-t border-black/[.07] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-red-700">{t('deleteTitle')}</p>
            <p className="mt-1 text-xs leading-relaxed text-stone-500">{t('deleteText')}</p>
          </div>
          <Button variant="outline" onClick={() => setDeleteOpen(true)} className="gap-2 rounded-full border-red-200 bg-white/60 text-red-700 hover:bg-red-50">
            <Trash2 size={14} /> {t('deleteButton')}
          </Button>
        </div>
      </section>

      <Dialog open={deleteOpen} onOpenChange={(open) => { setDeleteOpen(open); if (!open) { setConfirmText(''); setDeletePassword('') } }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-red-700">{t('deleteTitle')}</DialogTitle></DialogHeader>
          <p className="text-sm leading-relaxed text-stone-600">{t('deleteWarning')}</p>
          {user.hasPassword && (
            <div className="mt-3 space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">{t('deletePasswordLabel')}</label>
              <Input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className="h-11 rounded-xl border-black/10" />
            </div>
          )}
          <div className="mt-3 space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">{t('deleteConfirmLabel')}</label>
            <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={t('deleteConfirmWord')} className="h-11 rounded-xl border-black/10" />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="rounded-full">{t('deleteCancel')}</Button>
            <Button
              onClick={deleteAccount}
              disabled={deleting || confirmText !== t('deleteConfirmWord') || (user.hasPassword && !deletePassword)}
              className="rounded-full bg-red-600 text-white hover:bg-red-700"
            >
              {deleting ? t('deleting') : t('deleteConfirmButton')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

function Bars({ title, bars }: { title: string; bars: Bar[] }) {
  if (bars.length === 0) return null
  const max = Math.max(...bars.map((b) => b.count))
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400">{title}</p>
      <ul className="space-y-1.5">
        {bars.map((b) => (
          <li key={b.label} className="grid grid-cols-[minmax(0,9rem)_1fr_2rem] items-center gap-2 text-xs">
            <span className="truncate text-stone-700">{b.label}</span>
            <span className="h-2 rounded-full bg-black/[.05]"><span className="block h-full rounded-full bg-[#4256cc]" style={{ width: `${(b.count / max) * 100}%` }} /></span>
            <span className="text-right tabular-nums text-stone-500">{b.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function StatCard({ icon, value, label, wide }: { icon: React.ReactNode; value: number | string; label: string; wide?: boolean }) {
  return <div className={`paper-card rounded-2xl p-4 ${wide ? 'col-span-2 sm:col-span-1' : ''}`}><div className="mb-2 flex items-center gap-2 text-[#4256cc]">{icon}<span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">{label}</span></div><p className="font-display text-2xl font-semibold text-stone-900">{value}</p></div>
}
