import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

// Apple touch icons get their own rounded-corner mask from iOS, so this fills
// the full square rather than reusing the browser favicon dimensions.
// Geometry mirrors LogoMark in components/logo.tsx (salonwand + rode stip).
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#16162A',
        }}
      >
        <svg width="180" height="180" viewBox="0 0 120 120">
          <rect x="16" y="16" width="42" height="54" rx="2" fill="#A4482A" />
          <rect x="64" y="16" width="40" height="24" rx="2" fill="#E3B04B" />
          <rect x="64" y="46" width="40" height="24" rx="2" fill="#1F5A4A" />
          <rect x="16" y="76" width="26" height="28" rx="2" fill="#4A6FB5" />
          <rect x="48" y="76" width="56" height="28" rx="2" fill="#F4EFE6" />
          <circle cx="90" cy="90" r="6" fill="#D8342B" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
