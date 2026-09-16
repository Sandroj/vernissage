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
          <rect x="1.5" y="1.5" width="29" height="29" rx="9" fill="#4256cc" />
          <rect x="7.5" y="8" width="17" height="16" rx="2.5" fill="#fffdf8" />
          <path d="M9.5 21.5 14 16.5l3.1 3 2.5-2.6 2.9 3.3" stroke="#4256cc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M9.5 24h13" stroke="#24211c" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <circle cx="21.5" cy="9.5" r="3.4" fill="#ed694c" stroke="#fffdf8" strokeWidth="1.2" />
        </svg>
        <div style={{ display: 'flex', fontSize: 76, fontWeight: 600, color: '#24211c', letterSpacing: -2 }}>
          Pinacot
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: '#6b6355' }}>
          Kunstwerken en museumbezoeken bijhouden
        </div>
      </div>
    ),
    { ...size }
  )
}
