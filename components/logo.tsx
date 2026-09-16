/**
 * Pinacot-merk: een ingelijst kunstwerk met een koraalkleurige
 * "gezien"-stip. Puur SVG, dus scherp op elk formaat van favicon tot hero.
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
      <rect x="1.5" y="1.5" width="29" height="29" rx="9" fill="#4256cc" />
      <rect x="7.5" y="8" width="17" height="16" rx="2.5" fill="#fffdf8" />
      <path d="M9.5 21.5 14 16.5l3.1 3 2.5-2.6 2.9 3.3" stroke="#4256cc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 24h13" stroke="#24211c" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="21.5" cy="9.5" r="3.4" fill="#ed694c" stroke="#fffdf8" strokeWidth="1.2" />
    </svg>
  )
}

export function Logo({ size = 32, wordmark = true, className }: { size?: number; wordmark?: boolean; className?: string }) {
  return (
    <span className={`flex shrink-0 items-center gap-2.5 ${className ?? ''}`}>
      <LogoMark size={size} />
      {wordmark && <span className="font-display text-xl font-semibold">Pinacot</span>}
    </span>
  )
}
