import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

// Apple touch icons get their own rounded-corner mask from iOS, so this fills
// the full square rather than reusing the browser favicon dimensions.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#4256cc',
          borderRadius: 36,
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32">
          <rect x="7.5" y="8" width="17" height="16" rx="2.5" fill="#fffdf8" />
          <path d="M9.5 21.5 14 16.5l3.1 3 2.5-2.6 2.9 3.3" stroke="#4256cc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M9.5 24h13" stroke="#24211c" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <circle cx="21.5" cy="9.5" r="3.4" fill="#ed694c" stroke="#fffdf8" strokeWidth="1.2" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
