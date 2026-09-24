import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpengraphImage() {
  // Satori (next/og) kan geen woff2 lezen; daarom de .woff-versie.
  const instrumentSerif = await readFile(join(process.cwd(), 'app/fonts/InstrumentSerif-Regular.woff'))

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
          gap: 40,
          background: '#F4EFE6',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 44 }}>
          <svg width="168" height="168" viewBox="0 0 120 120">
            <rect width="120" height="120" rx="28" fill="#16162A" />
            <rect x="16" y="16" width="42" height="54" rx="2" fill="#A4482A" />
            <rect x="64" y="16" width="40" height="24" rx="2" fill="#E3B04B" />
            <rect x="64" y="46" width="40" height="24" rx="2" fill="#1F5A4A" />
            <rect x="16" y="76" width="26" height="28" rx="2" fill="#4A6FB5" />
            <rect x="48" y="76" width="56" height="28" rx="2" fill="#F4EFE6" />
            <circle cx="90" cy="90" r="6" fill="#D8342B" />
          </svg>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7 }}>
            <div style={{ display: 'flex', fontFamily: 'Instrument Serif', fontSize: 190, lineHeight: 0.8, letterSpacing: -4, color: '#16162A' }}>
              seen
            </div>
            <div style={{ display: 'flex', width: 42, height: 42, borderRadius: 21, background: '#D8342B', marginBottom: 4 }} />
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 30, color: '#5A5A66' }}>
          Kunstwerken en museumbezoeken bijhouden
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Instrument Serif', data: instrumentSerif, style: 'normal', weight: 400 }],
    }
  )
}
