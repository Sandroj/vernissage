'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { BookmarkPlus, Check, Search, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'

const SCREENS = [
  [
    { slug: 'vangogh',      name: 'Van Gogh' },
    { slug: 'picasso',      name: 'Picasso' },
    { slug: 'davinci',      name: 'Da Vinci' },
    { slug: 'monet',        name: 'Monet' },
    { slug: 'rembrandt',    name: 'Rembrandt' },
    { slug: 'dali',         name: 'Dalí' },
    { slug: 'kahlo',        name: 'Frida Kahlo' },
    { slug: 'vermeer',      name: 'Vermeer' },
    { slug: 'michelangelo', name: 'Michelangelo' },
    { slug: 'matisse',      name: 'Matisse' },
    { slug: 'klimt',        name: 'Klimt' },
    { slug: 'munch',        name: 'Munch' },
  ],
  [
    { slug: 'raphael',    name: 'Raphael' },
    { slug: 'botticelli', name: 'Botticelli' },
    { slug: 'caravaggio', name: 'Caravaggio' },
    { slug: 'goya',       name: 'Goya' },
    { slug: 'renoir',     name: 'Renoir' },
    { slug: 'degas',      name: 'Degas' },
    { slug: 'cezanne',    name: 'Cézanne' },
    { slug: 'manet',      name: 'Manet' },
    { slug: 'gauguin',    name: 'Gauguin' },
    { slug: 'mondrian',   name: 'Mondrian' },
    { slug: 'chagall',    name: 'Chagall' },
    { slug: 'pollock',    name: 'Pollock' },
  ],
  [
    { slug: 'warhol',    name: 'Andy Warhol' },
    { slug: 'rothko',    name: 'Rothko' },
    { slug: 'basquiat',  name: 'Basquiat' },
    { slug: 'klee',      name: 'Klee' },
    { slug: 'miro',      name: 'Miró' },
    { slug: 'magritte',  name: 'Magritte' },
    { slug: 'okeeffe',   name: "O'Keeffe" },
    { slug: 'schiele',   name: 'Schiele' },
    { slug: 'bosch',     name: 'Bosch' },
    { slug: 'vaneyck',   name: 'Jan van Eyck' },
    { slug: 'kandinsky', name: 'Kandinsky' },
  ],
]

// Alleen bij eerste registratie getoond (showIntro), niet bij een gewoon
// bezoek via de "Ontdekken"-navlink — zie discover/page.tsx.
const INTRO_ICONS = [BookmarkPlus, Search, Sparkles]

export default function DiscoverScreen({ initialVotes, isLoggedIn, showIntro }: { initialVotes: string[]; isLoggedIn: boolean; showIntro?: boolean }) {
  const router = useRouter()
  const t = useTranslations('Discover')
  const [screen, setScreen] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set(initialVotes))
  const [saving, setSaving] = useState(false)

  const introCount = showIntro ? INTRO_ICONS.length : 0
  const totalSteps = introCount + SCREENS.length
  const isIntro = screen < introCount

  function toggle(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  async function handleFinish() {
    if (!isLoggedIn) {
      router.push('/login?mode=register')
      return
    }
    setSaving(true)
    await fetch('/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artistNames: Array.from(selected) }),
    })
    setSaving(false)
    router.push('/')
  }

  const artists = SCREENS[screen - introCount] ?? SCREENS[0]
  const isLast = screen === totalSteps - 1
  const IntroIcon = INTRO_ICONS[screen]

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 text-center">
        {isIntro && <p className="eyebrow mb-2">{t('introEyebrow')}</p>}
        <h1 className="font-display text-4xl font-medium tracking-tight text-stone-900 sm:text-5xl">
          {isIntro ? t(`introTitle${screen + 1}`) : t('title')}
        </h1>
        <p className="mt-3 text-sm text-stone-500">{isIntro ? t(`introText${screen + 1}`) : t('subtitle')}</p>
      </div>

      <div className="mb-6 flex justify-center gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <button
            key={i}
            onClick={() => setScreen(i)}
            className={`rounded-full transition-all ${i === screen ? 'h-2 w-7 bg-[#4256cc]' : 'h-2 w-2 bg-black/15'}`}
          />
        ))}
      </div>

      {isIntro ? (
        <div className="paper-card mb-8 flex flex-col items-center gap-4 rounded-[1.75rem] px-8 py-14 text-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-[#4256cc]/10 text-[#4256cc]">
            {IntroIcon && <IntroIcon size={28} />}
          </div>
        </div>
      ) : (
        <div className="mb-8 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {artists.map(({ slug, name }) => {
            const isSelected = selected.has(slug)
            return (
              <button
                key={slug}
                onClick={() => toggle(slug)}
                className={`overflow-hidden rounded-2xl border-2 transition-all ${isSelected ? 'border-[#4256cc] shadow-lg shadow-[#4256cc]/15' : 'border-transparent'}`}
              >
                <div className="relative aspect-square bg-stone-200">
                  <img
                    src={`/images/discover/${slug}.jpg`}
                    alt={name}
                    className="size-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#4256cc]/25">
                      <div className="rounded-full bg-[#4256cc] p-1">
                        <Check size={14} className="text-white" />
                      </div>
                    </div>
                  )}
                </div>
                <div className={`bg-[#faf6ee] px-1 py-2 text-center text-xs font-medium ${isSelected ? 'text-[#4256cc]' : 'text-stone-600'}`}>
                  {name}
                </div>
              </button>
            )
          })}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          disabled={screen === 0}
          onClick={() => setScreen((s) => s - 1)}
          className="rounded-full border-black/10 bg-white/60 text-stone-700 hover:bg-white"
        >
          {t('previous')}
        </Button>
        {!isIntro && <span className="text-sm text-stone-500">{t('selected', { count: selected.size })}</span>}
        {isLast ? (
          <Button onClick={handleFinish} disabled={saving} className="rounded-full bg-[#ed694c] text-white hover:bg-[#db573c]">
            {saving ? t('saving') : isLoggedIn ? t('save') : t('loginToSave')}
          </Button>
        ) : (
          <Button onClick={() => setScreen((s) => s + 1)} className="rounded-full bg-[#4256cc] text-white hover:bg-[#3447b8]">
            {t('next')}
          </Button>
        )}
      </div>

      <p
        className="mt-4 cursor-pointer text-center text-sm text-stone-400 hover:text-stone-600"
        onClick={() => router.push('/')}
      >
        {t('skip')}
      </p>
    </div>
  )
}
