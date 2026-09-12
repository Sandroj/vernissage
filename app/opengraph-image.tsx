import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 28,
          background: '#f5f0e7',
        }}
      >
        <svg width="140" height="140" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="15" fill="#ed694c" stroke="#4256cc" strokeWidth="1.5" />
          <path d="M8,8 L12,8 L16,19 L20,8 L24,8 L16,25 Z" fill="#fffdf8" />
        </svg>
        <div style={{ display: 'flex', fontSize: 76, fontWeight: 600, color: '#24211c', letterSpacing: -2 }}>
          Vernissage
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: '#6b6355' }}>
          Kunstwerken en museumbezoeken bijhouden
        </div>
      </div>
    ),
    { ...size }
  )
}
