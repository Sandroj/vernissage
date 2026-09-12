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
          <circle cx="16" cy="16" r="15" fill="#fffdf8" stroke="#4256cc" strokeWidth="1.5" />
          <path d="M9,14 L9,9 L14,9" stroke="#24211c" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M23,18 L23,23 L18,23" stroke="#24211c" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="23.5" cy="23.5" r="3.6" fill="#ed694c" stroke="#fffdf8" strokeWidth="1.1" />
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
