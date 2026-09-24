import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpengraphImage() {
  // Satori (next/og) kan geen woff2 lezen; daarom de .woff-versie.
  const instrumentSerif = await readFile(join(process.cwd(), 'app/fonts/InstrumentSerif-Regular.woff'))
  const mark = await readFile(join(process.cwd(), 'public/icons/icon-512.png'))
  const markSrc = `data:image/png;base64,${mark.toString('base64')}`

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
          {/* Holo-rand kan Satori niet tekenen (geen conic-gradient), dus het
              merk komt uit de gegenereerde PNG. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={markSrc} width={176} height={176} alt="" />
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
