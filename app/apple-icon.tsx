import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

// Apple touch icons get their own rounded-corner mask from iOS, so this fills
// the full square (no ring, no transparent margin) rather than reusing the
// circular favicon mark.
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
          background: '#fffdf8',
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32">
          <path d="M9,14 L9,9 L14,9" stroke="#24211c" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M23,18 L23,23 L18,23" stroke="#24211c" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="23.5" cy="23.5" r="3.6" fill="#ed694c" stroke="#fffdf8" strokeWidth="1.1" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
