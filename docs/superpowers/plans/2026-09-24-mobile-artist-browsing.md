# Mobiel overzichtelijker: homepage-hero + kunstenaars-tegels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Maak de homepage-hero op mobiel compacter en vervang de twee losse "kunstenaar-preview"-implementaties (grote kaart op `/artists`, inline rij-lijst op de homepage) door één herbruikbare, compacte tegel die schaalt van 9 naar ~40 kunstenaars.

**Architecture:** Eén `ArtistCard`-component (nu compact) wordt hergebruikt op zowel de homepage (vaste set van 8, alfabetisch) als `/artists` (volledige, doorzoekbare lijst). `ProgressBar` krijgt een `hideLabel`-optie zodat de tegel een dunne balk zonder tekstlabel kan tonen. De hero-sectie op de homepage wijzigt alleen qua Tailwind-classNames (responsief), geen nieuwe component.

**Tech Stack:** Next.js App Router, React (client component voor `ArtistCard`/`ProgressBar`), Tailwind CSS, Jest + Testing Library, next-intl.

**Spec:** `docs/superpowers/specs/2026-09-24-mobile-artist-browsing-design.md`

## Global Constraints

- Geen datamodel- of API-wijzigingen (spec sectie "Niet in scope").
- Desktop-weergave van de hero blijft ongewijzigd (spec sectie 1).
- `ArtistCard` toont geen nationaliteit/geboortejaar meer (spec sectie 2) — bewuste trade-off, niet per ongeluk laten staan.
- Homepage toont maximaal 8 kunstenaars (alfabetisch, bestaande sortering) met een "Alle kunstenaars →"-link naar `/artists` (spec sectie 3).
- `tsc --noEmit` en `eslint` moeten schoon blijven na elke task.

---

### Task 1: `ProgressBar` — `hideLabel`-optie

**Files:**
- Modify: `components/progress-bar.tsx`
- Test: `__tests__/components/progress-bar.test.tsx`

**Interfaces:**
- Produces: `ProgressBar` prop `hideLabel?: boolean` (default `false`). Wanneer `true`, wordt alleen de dunne balk gerenderd, zonder de "x van y gezien"/percentage-tekstregel erboven. Overige props (`value`, `seen`, `total`, `className`, `animate`) ongewijzigd.

- [ ] **Step 1: Schrijf de falende test**

Voeg toe aan `__tests__/components/progress-bar.test.tsx` (bestaande `renderProgressBar`-helper hergebruiken):

```tsx
  it('verbergt het tekstlabel als hideLabel is gezet', () => {
    renderProgressBar({ value: 50, seen: 5, total: 10, animate: false, hideLabel: true })
    expect(screen.queryByText('5 van 10 gezien')).not.toBeInTheDocument()
    expect(screen.queryByText('50%')).not.toBeInTheDocument()
  })

  it('toont het tekstlabel standaard nog steeds', () => {
    renderProgressBar({ value: 50, seen: 5, total: 10, animate: false })
    expect(screen.getByText('5 van 10 gezien')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run de tests, bevestig dat de eerste faalt**

Run: `npx jest __tests__/components/progress-bar.test.tsx`
Expected: de nieuwe `hideLabel`-test FAILT (`hideLabel` bestaat nog niet, dus het label wordt altijd getoond — `screen.queryByText('5 van 10 gezien')` vindt het element wél, `not.toBeInTheDocument()` faalt). De tweede nieuwe test slaagt al (ongewijzigd gedrag).

- [ ] **Step 3: Implementeer `hideLabel` in `components/progress-bar.tsx`**

Vervang de volledige inhoud van `components/progress-bar.tsx` door:

```tsx
'use client'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

interface ProgressBarProps {
  value: number
  seen: number
  total: number
  className?: string
  animate?: boolean
  hideLabel?: boolean
}

export default function ProgressBar({ value, seen, total, className, animate = true, hideLabel = false }: ProgressBarProps) {
  const [display, setDisplay] = useState(animate ? 0 : value)
  const t = useTranslations('Progress')

  useEffect(() => {
    if (!animate) return
    const timer = setTimeout(() => setDisplay(value), 100)
    return () => clearTimeout(timer)
  }, [value, animate])

  return (
    <div className={cn('space-y-1.5', className)}>
      {!hideLabel && (
        <div className="flex justify-between text-xs">
          <span className="text-stone-500">{t('seenOf', { seen, total })}</span>
          <span className={cn('font-semibold', value > 0 ? 'text-[#4256cc]' : 'text-stone-400')}>{Math.round(value)}%</span>
        </div>
      )}
      <div className="h-1.5 bg-black/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${display}%`,
            background: display > 0
              ? 'linear-gradient(90deg, #4256cc, #746ddf 58%, #ed694c)'
              : 'transparent'
          }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run de tests, bevestig dat ze slagen**

Run: `npx jest __tests__/components/progress-bar.test.tsx`
Expected: alle tests PASS (inclusief de bestaande twee).

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint components/progress-bar.tsx __tests__/components/progress-bar.test.tsx`
Expected: geen output / exit 0.

- [ ] **Step 6: Commit**

```bash
git add components/progress-bar.tsx __tests__/components/progress-bar.test.tsx
git commit -m "$(cat <<'EOF'
Add hideLabel option to ProgressBar for compact tile use

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `ArtistCard` — herschrijven naar compacte tegel

**Files:**
- Modify: `components/artist-card.tsx`
- Test: `__tests__/components/artist-card.test.tsx` (nieuw)

**Interfaces:**
- Consumes: `ProgressBar` met `hideLabel` (Task 1).
- Produces: `ArtistCard` default export, props:
  ```ts
  interface ArtistCardProps {
    artist: {
      id: number
      name: string
      slug: string
      portrait_url?: string | null
      _count: { artworks: number }
      artworks: { image_local_path?: string | null; image_url?: string | null }[]
    }
    seenCount: number
    featuredImage?: string | null
  }
  ```
  (Let op: `nationality`, `birth_year`, `death_year` zijn uit de props gehaald — de tegel toont ze niet meer. Extra velden op het meegegeven object storen niet, TypeScript's structural typing staat dat toe.)
  Later gebruikt door Task 4 (`app/page.tsx`) en Task 5 (`app/artists/page.tsx`, ongewijzigd qua aanroep, alleen de grid-classNames errond wijzigen).

- [ ] **Step 1: Schrijf de falende test**

Maak `__tests__/components/artist-card.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import ArtistCard from '@/components/artist-card'
import messages from '@/messages/nl.json'

jest.mock('next/link', () => {
  return {
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: ({ children, href }: any) => <a href={href}>{children}</a>,
  }
})

function renderArtistCard(overrides: Partial<React.ComponentProps<typeof ArtistCard>> = {}) {
  const defaultProps: React.ComponentProps<typeof ArtistCard> = {
    artist: {
      id: 1,
      name: 'Claude Monet',
      slug: 'claude-monet',
      portrait_url: null,
      _count: { artworks: 12 },
      artworks: [],
    },
    seenCount: 3,
    featuredImage: null,
  }
  return render(
    <NextIntlClientProvider locale="nl" messages={messages} timeZone="Europe/Amsterdam" now={new Date('2026-09-18T00:00:00Z')}>
      <ArtistCard {...defaultProps} {...overrides} />
    </NextIntlClientProvider>
  )
}

describe('ArtistCard', () => {
  it('toont de naam van de kunstenaar', () => {
    renderArtistCard()
    expect(screen.getByText('Claude Monet')).toBeInTheDocument()
  })

  it('linkt naar de kunstenaar-detailpagina', () => {
    renderArtistCard()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/artists/claude-monet')
  })

  it('toont een letter-fallback zonder afbeelding', () => {
    renderArtistCard()
    expect(screen.getByText('C')).toBeInTheDocument()
  })

  it('toont geen geboortejaar meer (compacte tegel)', () => {
    renderArtistCard()
    expect(screen.queryByText(/geb\./)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run de test, bevestig dat 'm faalt**

Run: `npx jest __tests__/components/artist-card.test.tsx`
Expected: FAIL — de huidige `ArtistCard` rendert de naam binnen een grotere kaart met jaartal/nationaliteit-regel; de test op zich zou grotendeels slagen met de oude component, maar dient als baseline. Bevestig in elk geval dat de testrunner de nieuwe testfile oppikt en draait (geen "no tests found").

- [ ] **Step 3: Herschrijf `components/artist-card.tsx`**

Vervang de volledige inhoud door:

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import ProgressBar from '@/components/progress-bar'
import { proxyImg } from '@/lib/utils'
import { useTranslations } from 'next-intl'

interface ArtistCardProps {
  artist: {
    id: number
    name: string
    slug: string
    portrait_url?: string | null
    _count: { artworks: number }
    artworks: { image_local_path?: string | null; image_url?: string | null }[]
  }
  seenCount: number
  featuredImage?: string | null
}

export default function ArtistCard({ artist, seenCount, featuredImage }: ArtistCardProps) {
  const t = useTranslations('Artists')
  const total = artist._count.artworks
  const pct = total > 0 ? (seenCount / total) * 100 : 0

  const [imgError, setImgError] = useState(false)
  const imgSrc = imgError ? null : proxyImg(featuredImage ?? artist.portrait_url, 300)

  return (
    <Link
      href={`/artists/${artist.slug}`}
      className="group block"
    >
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-stone-200 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-xl">
        {imgSrc ? (
          <img
            src={imgSrc}
            onError={() => setImgError(true)}
            alt={t('featuredAlt', { name: artist.name })}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-[#e7e9fa] font-display text-4xl font-bold text-[#4256cc]/50">
            {artist.name[0]}
          </div>
        )}
      </div>
      <div className="mt-2 px-0.5">
        <h2 className="truncate font-display text-base font-semibold text-stone-900 transition-colors group-hover:text-[#4256cc]">
          {artist.name}
        </h2>
        <ProgressBar value={pct} seen={seenCount} total={total} animate={false} hideLabel className="mt-1" />
      </div>
    </Link>
  )
}
```

- [ ] **Step 4: Run de test, bevestig dat ze slagen**

Run: `npx jest __tests__/components/artist-card.test.tsx`
Expected: alle 4 tests PASS.

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint components/artist-card.tsx __tests__/components/artist-card.test.tsx`
Expected: geen output / exit 0. (`app/artists/page.tsx` gebruikt `ArtistCard` nog met de oude prop-vorm — dat is tsc-compatibel zolang de daar meegegeven `artist`-objecten minstens de nieuwe, kleinere interface dekken; ze bevatten alle velden nog steeds, dus dit compileert. Task 5 ruimt de niet meer relevante grid-classNames op.)

- [ ] **Step 6: Commit**

```bash
git add components/artist-card.tsx __tests__/components/artist-card.test.tsx
git commit -m "$(cat <<'EOF'
Rewrite ArtistCard as a compact square tile

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Homepage hero — mobiel compacter (CSS only)

**Files:**
- Modify: `app/page.tsx:126-181` (hero-sectie)

**Interfaces:**
- Geen — puur Tailwind-classNames, geen nieuwe props of functies.

- [ ] **Step 1: Pas de hero-sectie classNames aan**

In `app/page.tsx`, regel 126 (sectie-opening), wijzig:

```tsx
      <section className="relative overflow-hidden rounded-[2rem] bg-[#25231f] px-6 py-8 text-white sm:px-10 sm:py-12 lg:min-h-[570px] lg:px-14 lg:py-16">
```

naar:

```tsx
      <section className="relative overflow-hidden rounded-[2rem] bg-[#25231f] px-5 py-6 text-white sm:px-10 sm:py-12 lg:min-h-[570px] lg:px-14 lg:py-16">
```

Regel 134 (titel), wijzig:

```tsx
            <h1 className="font-display text-[clamp(3.6rem,8vw,7.7rem)] font-medium leading-[.82] text-[#fffaf0]">
```

naar:

```tsx
            <h1 className="font-display text-[clamp(2.75rem,11vw,7.7rem)] font-medium leading-[.82] text-[#fffaf0]">
```

Regel 151 (fotocarrousel-wrapper), wijzig:

```tsx
          <div className="relative h-[370px] w-full overflow-hidden rounded-[1.6rem] sm:h-[430px]">
```

naar:

```tsx
          <div className="relative h-[200px] w-full overflow-hidden rounded-[1.6rem] sm:h-[430px]">
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint app/page.tsx`
Expected: geen output / exit 0. (Puur classNames-wijziging, geen logica — er is geen geautomatiseerde test voor dit server component; verificatie gebeurt visueel in Task 6.)

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "$(cat <<'EOF'
Shrink homepage hero on mobile (title, padding, carousel height)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Homepage — kunstenaarssectie naar compacte tegel-grid (max 8)

**Files:**
- Modify: `app/page.tsx` (imports + "Artists progress"-sectie, regels 183-216 in de huidige versie)

**Interfaces:**
- Consumes: `ArtistCard` (Task 2), props zoals hierboven.

- [ ] **Step 1: Vervang de import van `ProgressBar` door `ArtistCard`**

In `app/page.tsx`, regel 5, wijzig:

```tsx
import ProgressBar from '@/components/progress-bar'
```

naar:

```tsx
import ArtistCard from '@/components/artist-card'
```

(De rest van het bestand gebruikt `ProgressBar` nergens anders — na deze en de volgende stap verdwijnt de enige aanroep.)

- [ ] **Step 2: Vervang de "Artists progress"-sectie**

Vervang het blok (huidige regels 183-216):

```tsx
      {/* Artists progress */}
      <section>
        <div className="mb-7 flex items-end justify-between">
          <div><p className="eyebrow mb-2">{t('collectionEyebrow')}</p><h2 className="font-display text-4xl font-medium text-stone-900 sm:text-5xl">{t('artists')}</h2></div>
          <Link href="/artists" className="flex items-center gap-1.5 text-sm font-medium text-stone-500 transition-colors hover:text-[#4256cc]">
            {t('allArtists')} <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {artists.map((artist) => {
            const seen = seenCounts[artist.id] ?? 0
            const total = artist._count.artworks
            const pct = total > 0 ? (seen / total) * 100 : 0
            return (
              <Link
                key={artist.id}
                href={`/artists/${artist.slug}`}
                className="paper-card group flex items-center gap-4 rounded-2xl p-5 transition duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-stone-200">
                  {featuredArtistImages.get(artist.name) && <img src={proxyImg(featuredArtistImages.get(artist.name)) ?? ''} alt="" loading="lazy" decoding="async" className="size-full object-cover transition duration-500 group-hover:scale-105" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display text-xl font-semibold text-stone-900 transition-colors group-hover:text-[#4256cc]">{artist.name}</span>
                    <span className="ml-4 text-xs text-stone-400">{seen}/{total}</span>
                  </div>
                  <ProgressBar value={pct} seen={seen} total={total} animate={false} />
                </div>
              </Link>
            )
          })}
        </div>
      </section>
```

door:

```tsx
      {/* Artists progress */}
      <section>
        <div className="mb-7 flex items-end justify-between">
          <div><p className="eyebrow mb-2">{t('collectionEyebrow')}</p><h2 className="font-display text-4xl font-medium text-stone-900 sm:text-5xl">{t('artists')}</h2></div>
          <Link href="/artists" className="flex items-center gap-1.5 text-sm font-medium text-stone-500 transition-colors hover:text-[#4256cc]">
            {t('allArtists')} <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {artists.slice(0, 8).map((artist) => (
            <ArtistCard
              key={artist.id}
              artist={artist}
              seenCount={seenCounts[artist.id] ?? 0}
              featuredImage={featuredArtistImages.get(artist.name) ?? null}
            />
          ))}
        </div>
      </section>
```

- [ ] **Step 3: Verwijder de nu ongebruikte `proxyImg`-import als die verder nergens meer in het bestand wordt gebruikt**

Check: `grep -n "proxyImg" app/page.tsx`. Als de enige overige match de import-regel zelf is, verwijder die regel (`import { proxyImg } from '@/lib/utils'`). (De hero-carrousel hoger in het bestand gebruikt `proxyImg` ook — als die aanroep er nog staat, blijft de import nodig; alleen verwijderen als `grep` maar 1 match geeft.)

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint app/page.tsx`
Expected: geen output / exit 0. Een eslint-fout over een ongebruikte import (`ProgressBar` of `proxyImg`) betekent dat Step 1 of Step 3 niet volledig is doorgevoerd — controleer met `grep -n "ProgressBar\|proxyImg" app/page.tsx`.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "$(cat <<'EOF'
Show homepage artists as a capped 8-tile ArtistCard grid

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `/artists`-pagina — grid-classNames voor compacte tegels

**Files:**
- Modify: `app/artists/page.tsx:100`

**Interfaces:**
- Consumes: `ArtistCard` (Task 2) — aanroep zelf (props) blijft ongewijzigd, alleen de omringende grid-`className`.

- [ ] **Step 1: Pas de grid-className aan**

In `app/artists/page.tsx`, regel 100, wijzig:

```tsx
      <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
```

naar:

```tsx
      <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint app/artists/page.tsx`
Expected: geen output / exit 0.

- [ ] **Step 3: Commit**

```bash
git add app/artists/page.tsx
git commit -m "$(cat <<'EOF'
Widen /artists grid to match the compact ArtistCard tile

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Volledige testrun + visuele verificatie

**Files:** geen wijzigingen — alleen verificatie.

**Interfaces:** n.v.t.

- [ ] **Step 1: Volledige testsuite + typecheck + lint**

Run: `npx jest && npx tsc --noEmit && npx eslint .`
Expected: alle tests PASS, geen tsc/eslint-fouten (behalve de al bekende 13 pre-existing lintfouten in tests/seeds, zie HANDOFF — niet nieuw geïntroduceerd).

- [ ] **Step 2: Lokaal visueel controleren (`npm run dev`, praat met live Turso-data)**

Start de dev-server (via `.claude/launch.json` in de `main-2`-repo, server-naam "Vernissage dev", of handmatig `npm run dev` — let op `listen EPERM` in de sandbox, zie HANDOFF-valkuilen). Bezoek in de browser op mobiele viewport (375px breed) én desktop-breedte:
- `/` — hero neemt duidelijk minder ruimte in op 375px; desktop-hero ziet er ongewijzigd uit; kunstenaarssectie toont maximaal 8 compacte tegels (2 kolommen op 375px) + werkende "Alle kunstenaars"-link.
- `/artists` — alle kunstenaars in de compacte tegel-grid, zoekbalk werkt nog, tegels zijn goed tikbaar (geen te kleine tap-targets).
- Kliktest: een tegel op beide pagina's opent de juiste `/artists/<slug>`-pagina.
- Fallback-check: als een kunstenaar geen afbeelding heeft, toont de tegel de letter-fallback netjes vierkant (geen vervormd beeld).

Geen geautomatiseerde test voor deze stap — leg in HANDOFF vast welke van deze checks visueel bevestigd zijn en welke (nog) niet, zoals bij eerdere sessies.

- [ ] **Step 3: Geen aparte commit nodig**

Dit is een verificatie-taak; als Step 2 een probleem aan het licht brengt, los dat op als een korte extra task (nieuwe kleine commit) voor je HANDOFF bijwerkt.

---

## Self-Review (uitgevoerd tijdens het schrijven van dit plan)

- **Spec-dekking:** sectie 1 (hero) → Task 3; sectie 2 (compacte tegel) → Task 1+2; sectie 3 (homepage cap 8) → Task 4; sectie 4 (/artists grid) → Task 5; "Testen" → Task 6. Geen gat gevonden.
- **Placeholder-scan:** geen TBD/TODO, alle stappen bevatten volledige code.
- **Type-consistentie:** `ArtistCardProps` (Task 2) en de aanroepen in Task 4/5 gebruiken dezelfde veldnamen (`artist`, `seenCount`, `featuredImage`); `ProgressBar`'s `hideLabel` (Task 1) wordt in Task 2 exact zo aangeroepen.
