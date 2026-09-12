/**
 * Vernissage-merk: twee lijsthoeken met de koraalrode "verkocht"-stip die
 * galeries naast een geclaimd werk hangen — dezelfde huisstijlkleuren als de
 * rest van de app (#ed694c / #4256cc). Puur SVG, dus scherp op elk formaat
 * van favicon tot hero.
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
      <circle cx="16" cy="16" r="15" fill="#fffdf8" stroke="#4256cc" strokeWidth="1.5" />
      <path d="M9,14 L9,9 L14,9" stroke="#24211c" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M23,18 L23,23 L18,23" stroke="#24211c" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="23.5" cy="23.5" r="3.6" fill="#ed694c" stroke="#fffdf8" strokeWidth="1.1" />
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
