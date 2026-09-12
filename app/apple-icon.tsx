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
          background: '#ed694c',
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32">
          <path d="M8,8 L12,8 L16,19 L20,8 L24,8 L16,25 Z" fill="#fffdf8" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
