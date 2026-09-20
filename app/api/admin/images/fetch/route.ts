import { NextResponse } from 'next/server'
import { getAdminEmail } from '@/lib/admin'
import { assertPublicHttpsUrl } from '@/lib/fetch-guard'
import { imageExtensions, hasValidImageSignature, optimizeAndUploadImage } from '@/lib/r2-image'
import { extractMeta, extractDimensions, extractMedium } from '@/lib/url-scrape'

export const runtime = 'nodejs'
const maxBytes = 25 * 1024 * 1024

async function fetchBytes(url: URL) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`Ophalen mislukt (${res.status}).`)
  const contentType = res.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? ''
  const contentLength = Number(res.headers.get('content-length') ?? '0')
  if (contentLength > maxBytes) throw new Error('Bestand is groter dan 25 MB.')
  const bytes = Buffer.from(await res.arrayBuffer())
  if (bytes.byteLength > maxBytes) throw new Error('Bestand is groter dan 25 MB.')
  return { bytes, contentType }
}

export async function POST(req: Request) {
  if (!await getAdminEmail()) return NextResponse.json({ error: 'Niet bevoegd' }, { status: 403 })
  const body = await req.json().catch(() => null)
  const rawUrl = typeof body?.url === 'string' ? body.url.trim() : ''
  if (!rawUrl) return NextResponse.json({ error: 'Geef een URL op.' }, { status: 400 })

  try {
    const pageUrl = await assertPublicHttpsUrl(rawUrl)
    const first = await fetchBytes(pageUrl)

    let imageBytes = first.bytes
    let imageContentType = first.contentType
    let title: string | undefined
    let medium_raw: string | undefined
    let dimensions_raw: string | undefined

    if (first.contentType === 'text/html') {
      const html = first.bytes.toString('utf-8')
      const imageRef = extractMeta(html, 'og:image') ?? extractMeta(html, 'twitter:image')
      if (!imageRef) return NextResponse.json({ error: 'Geen afbeelding gevonden op deze pagina.' }, { status: 422 })
      const imageUrl = await assertPublicHttpsUrl(new URL(imageRef, pageUrl).toString())
      const second = await fetchBytes(imageUrl)
      imageBytes = second.bytes
      imageContentType = second.contentType
      title = extractMeta(html, 'og:title') ?? html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim()
      const text = html.replace(/<[^>]+>/g, ' ')
      dimensions_raw = extractDimensions(text)
      medium_raw = extractMedium(text)
    } else if (!imageExtensions[first.contentType]) {
      return NextResponse.json({ error: 'Deze URL is geen webpagina en geen JPEG-, PNG- of WebP-afbeelding.' }, { status: 422 })
    }

    if (!imageExtensions[imageContentType]) return NextResponse.json({ error: 'De gevonden afbeelding is geen JPEG, PNG of WebP.' }, { status: 422 })
    if (!hasValidImageSignature(imageContentType, imageBytes)) return NextResponse.json({ error: 'Bestandstype komt niet overeen met de inhoud van het beeld.' }, { status: 400 })

    const uploaded = await optimizeAndUploadImage(imageBytes)
    return NextResponse.json({
      ...uploaded,
      sourceUrl: rawUrl,
      image_source_url: rawUrl,
      image_source_name: pageUrl.hostname.replace(/^www\./, ''),
      title,
      medium_raw,
      dimensions_raw,
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'R2_NOT_CONFIGURED') return NextResponse.json({ error: 'R2-upload is nog niet geconfigureerd.' }, { status: 503 })
    const message = err instanceof Error ? err.message : 'Ophalen mislukt.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
