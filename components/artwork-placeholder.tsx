'use client'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'

const palettes = [
  { bg: '#f3dfcf', panel: '#cf4f43', ink: '#27343b', accent: '#e7b34c' },
  { bg: '#e4ead8', panel: '#336b63', ink: '#2f2731', accent: '#c75c42' },
  { bg: '#ead8cf', panel: '#4256cc', ink: '#2f2a23', accent: '#f0b24a' },
  { bg: '#dce8e6', panel: '#9b3f36', ink: '#29333a', accent: '#d7a54a' },
  { bg: '#efe3bd', panel: '#315e72', ink: '#3a2d2a', accent: '#d95f45' },
]

function hash(value: string) {
  let n = 0
  for (let i = 0; i < value.length; i += 1) n = (n * 31 + value.charCodeAt(i)) >>> 0
  return n
}

interface ArtworkPlaceholderProps {
  title: string
  year?: number | null
  artistSlug?: string | null
  label: string
  className?: string
  compact?: boolean
}

export default function ArtworkPlaceholder({ title, year, artistSlug, label, className, compact = false }: ArtworkPlaceholderProps) {
  const seed = hash(`${artistSlug ?? ''}:${title}:${year ?? ''}`)
  const palette = palettes[seed % palettes.length]
  const initials = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
  const protectedRights = artistSlug === 'frida-kahlo'

  return (
    <div
      className={cn('relative isolate flex size-full overflow-hidden text-left', className)}
      style={{ backgroundColor: palette.bg }}
      aria-label={label}
    >
      <div
        className="absolute inset-y-0 left-0 w-[68%]"
        style={{
          background: `linear-gradient(135deg, ${palette.panel}, ${palette.ink})`,
          clipPath: 'polygon(0 0, 82% 0, 58% 100%, 0 100%)',
        }}
      />
      <div
        className="absolute right-0 top-0 h-[56%] w-[52%]"
        style={{
          background: `repeating-linear-gradient(135deg, ${palette.accent} 0 9px, transparent 9px 18px)`,
          opacity: 0.5,
          clipPath: 'polygon(30% 0, 100% 0, 100% 100%, 0 72%)',
        }}
      />
      <div
        className="absolute bottom-0 right-0 h-[42%] w-[66%]"
        style={{
          backgroundColor: '#fffaf0',
          opacity: 0.72,
          clipPath: 'polygon(18% 8%, 100% 0, 100% 100%, 0 100%)',
        }}
      />
      <div className={cn('relative z-10 flex size-full flex-col justify-between p-4', compact ? 'p-4' : 'p-6 sm:p-8')}>
        <div className="flex items-center justify-between gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/18 text-white ring-1 ring-white/20">
            <ImageOff size={compact ? 16 : 18} aria-hidden="true" />
          </span>
          {year && (
            <span className="rounded-full bg-white/75 px-2.5 py-1 text-[10px] font-semibold text-stone-700 shadow-sm">
              {year}
            </span>
          )}
        </div>
        <div>
          <div className={cn('font-display font-semibold leading-none text-white/92', compact ? 'text-4xl' : 'text-6xl sm:text-7xl')}>
            {initials || '?'}
          </div>
          <p className={cn('mt-3 max-w-[14rem] font-semibold leading-tight', compact ? 'text-[11px]' : 'text-sm', protectedRights ? 'text-white/80' : 'text-white/72')}>
            {label}
          </p>
        </div>
      </div>
    </div>
  )
}
