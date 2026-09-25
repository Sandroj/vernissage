'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import SeenModal from '@/components/seen-modal'

type Work = { id: number; title: string; image_url: string | null; image_local_path: string | null; artist: string }

// Onboarding bij een lege collectie: tik bekende werken aan die je ooit zag.
export default function FirstSeenPicker({ works }: { works: Work[] }) {
  const t = useTranslations('Home')
  const [picked, setPicked] = useState<Work | null>(null)
  const [seen, setSeen] = useState<number[]>([])

  return (
    <section>
      <p className="eyebrow mb-2">{t('firstEyebrow')}</p>
      <h2 className="font-display text-4xl font-medium text-stone-900">{t('firstTitle')}</h2>
      <p className="mt-2 max-w-2xl text-sm text-stone-500">{t('firstText')}</p>
      <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {works.map((w) => {
          const done = seen.includes(w.id)
          return (
            <button key={w.id} type="button" disabled={done} onClick={() => setPicked(w)} aria-pressed={done} className="group text-left">
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-stone-200 shadow-sm ring-1 ring-black/5 transition-all group-enabled:group-hover:-translate-y-1 group-enabled:group-hover:shadow-xl">
                <Image src={w.image_local_path ?? w.image_url ?? '/placeholder.jpg'} alt={w.title} fill sizes="(max-width: 640px) 33vw, 16vw" className="object-cover" />
                {done && <div className="absolute inset-0 grid place-items-center bg-[#4256cc]/55"><Check size={28} className="text-white" /></div>}
              </div>
              <p className="mt-2 truncate text-xs text-stone-500">{w.title}</p>
            </button>
          )
        })}
      </div>
      {seen.length > 0 && (
        <Link href="/profile" className="mt-5 inline-block text-sm font-semibold text-[#4256cc] hover:underline">
          {t('firstDone', { count: seen.length })}
        </Link>
      )}
      {picked && (
        <SeenModal
          key={picked.id}
          artworkId={picked.id}
          artworkTitle={picked.title}
          open
          onOpenChange={(open) => { if (!open) setPicked(null) }}
          onSaved={() => setSeen((s) => [...s, picked.id])}
          onRemoved={() => setPicked(null)}
        />
      )}
    </section>
  )
}
