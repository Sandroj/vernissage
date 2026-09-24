/**
 * Seen-merk: een "salonwand" — kunstwerken dicht op elkaar gehangen — met de
 * rode "gezien"-stip. In galeries betekent een rode stip "verkocht"; bij Seen
 * betekent hij "gezien". Het woordmerk is `seen` in Instrument Serif, gevolgd
 * door dezelfde stip.
 *
 * Puur SVG. Onder 40 px valt het merk terug op een vereenvoudigde versie
 * (drie vlakken + stip) zodat het ook als favicon leesbaar blijft.
 */

export const BRAND = {
  ink: '#16162A',
  ivory: '#F4EFE6',
  siena: '#A4482A',
  ochre: '#E3B04B',
  viridian: '#1F5A4A',
  blue: '#4A6FB5',
  dot: '#D8342B',
} as const

type MarkTone = 'dark' | 'light'

export function LogoMark({
  size = 32,
  tone = 'dark',
  className,
}: {
  size?: number
  /** `dark`: donkere tegel (standaard). `light`: ivoren tegel voor op donkere achtergronden. */
  tone?: MarkTone
  className?: string
}) {
  const bg = tone === 'dark' ? BRAND.ink : BRAND.ivory
  const accentTile = tone === 'dark' ? BRAND.ivory : BRAND.ink
  const simple = size < 40

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="120" height="120" rx="28" fill={bg} />
      {simple ? (
        <>
          <rect x="14" y="14" width="44" height="92" rx="3" fill={BRAND.siena} />
          <rect x="64" y="14" width="42" height="42" rx="3" fill={BRAND.ochre} />
          <rect x="64" y="62" width="42" height="44" rx="3" fill={accentTile} />
          <circle cx="85" cy="84" r="12" fill={BRAND.dot} />
        </>
      ) : (
        <>
          <rect x="16" y="16" width="42" height="54" rx="2" fill={BRAND.siena} />
          <rect x="64" y="16" width="40" height="24" rx="2" fill={BRAND.ochre} />
          <rect x="64" y="46" width="40" height="24" rx="2" fill={BRAND.viridian} />
          <rect x="16" y="76" width="26" height="28" rx="2" fill={BRAND.blue} />
          <rect x="48" y="76" width="56" height="28" rx="2" fill={accentTile} />
          <circle cx="90" cy="90" r="6" fill={BRAND.dot} />
        </>
      )}
    </svg>
  )
}

/**
 * Het woordmerk `seen` + rode stip. Schaalt met `fontSize` (of met de
 * font-size van de omgeving als je die niet meegeeft); de stip is 0.22em.
 */
export function Wordmark({
  fontSize,
  className,
}: {
  fontSize?: number
  className?: string
}) {
  return (
    <span
      role="img"
      aria-label="Seen"
      className={`inline-flex items-end font-logo ${className ?? ''}`}
      style={{ fontSize, gap: '0.035em' }}
    >
      <span aria-hidden="true" style={{ lineHeight: 0.8, letterSpacing: '-0.02em' }}>
        seen
      </span>
      <span
        aria-hidden="true"
        className="inline-block shrink-0 rounded-full"
        style={{ width: '0.22em', height: '0.22em', marginBottom: '0.018em', background: BRAND.dot }}
      />
    </span>
  )
}

export function Logo({
  size = 32,
  wordmark = true,
  tone = 'dark',
  className,
}: {
  size?: number
  wordmark?: boolean
  tone?: MarkTone
  className?: string
}) {
  return (
    <span className={`flex shrink-0 items-center ${className ?? ''}`} style={{ gap: size * 0.3 }}>
      <LogoMark size={size} tone={tone} />
      {wordmark && <Wordmark fontSize={Math.round(size * 1.05)} />}
    </span>
  )
}
