/**
 * Vernissage-merk: een coral rondel met een dik "V"-glyph en een dunne
 * kobalt ring — dezelfde twee accentkleuren die de rest van de app al
 * gebruikt (#ed694c / #4256cc). Puur SVG, dus scherp op elk formaat van
 * favicon tot hero.
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="15" fill="#ed694c" stroke="#4256cc" strokeWidth="1.5" />
      <path d="M8,8 L12,8 L16,19 L20,8 L24,8 L16,25 Z" fill="#fffdf8" />
    </svg>
  )
}

export function Logo({ size = 32, wordmark = true, className }: { size?: number; wordmark?: boolean; className?: string }) {
  return (
    <span className={`flex shrink-0 items-center gap-2.5 ${className ?? ''}`}>
      <LogoMark size={size} />
      {wordmark && <span className="font-display text-xl font-semibold">Vernissage</span>}
    </span>
  )
}
