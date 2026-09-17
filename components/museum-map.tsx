'use client'
import { useEffect, useRef } from 'react'

// Self-hosted Protomaps PMTiles-basemap op de bestaande R2-bucket (z0-7,
// voldoende voor deze kaart die nooit verder inzoomt dan 7) — vervangt de
// CARTO-tegelservice, geen API-key/per-tile-kosten.
const BASEMAP_URL = 'https://pub-c0a3f32bc99e468483e04b1b8073d00c.r2.dev/basemaps/world-lowzoom.pmtiles'

export interface MuseumPin {
  id: number
  name: string
  city: string
  country: string
  lat: number
  lng: number
  artworkCount: number
  previewImage: string | null
  seenCount: number
  hasLoan?: boolean
}

interface MuseumMapProps {
  museums: MuseumPin[]
  labels: { works: string; seen: string; openMuseum: string; onLoanHint?: string }
  compact?: boolean
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character] ?? character)
}

export default function MuseumMap({ museums, labels, compact = false }: MuseumMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersLayerRef = useRef<any>(null)
  const museumsRef = useRef(museums)
  museumsRef.current = museums

  useEffect(() => {
    if (!mapRef.current) return
    // React Strict Mode (dev only) mounts, cleans up, and mounts again
    // synchronously, but this init is async — without this flag the first
    // and second run would both try to call L.map() on the same container
    // once their imports resolve, and Leaflet throws on the second call.
    let cancelled = false

    // Dynamically import Leaflet (client-only)
    import('leaflet').then((L) => {
      if (cancelled || !mapRef.current) return

      // Fix default marker icon path issues with webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current, {
        center: [43, 8],
        zoom: 3,
        zoomControl: true,
        scrollWheelZoom: true,
      })

      leafletRef.current = L
      mapInstanceRef.current = map
      markersLayerRef.current = L.layerGroup().addTo(map)

      // Light gallery-like basemap, self-hosted on R2 (Protomaps PMTiles) —
      // no vendor tile API/key, no per-request tile costs.
      import('protomaps-leaflet').then((protomapsL) => {
        if (cancelled) return
        protomapsL.leafletLayer({
          url: BASEMAP_URL,
          flavor: 'light',
          lang: 'en',
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://protomaps.com">Protomaps</a>',
        }).addTo(map)
        // Canvas tiles don't always paint on the very first frame (container
        // size/layout not settled yet at L.map() init) — this same nudge is
        // what a manual scroll/zoom was doing by accident before this fix.
        requestAnimationFrame(() => map.invalidateSize())
      })

      renderMarkers()
    })

    return () => {
      cancelled = true
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Kaart wordt eenmalig aangemaakt; markers worden opnieuw getekend zodra de
  // pins veranderen (bv. nadat de gebruiker zijn locatie deelt of filtert).
  useEffect(() => {
    renderMarkers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [museums])

  function renderMarkers() {
    const L = leafletRef.current
    const map = mapInstanceRef.current
    const layer = markersLayerRef.current
    if (!L || !map || !layer) return
    layer.clearLayers()

    museumsRef.current.forEach((m) => {
      const pct = m.artworkCount > 0 ? Math.round((m.seenCount / m.artworkCount) * 100) : 0
      const hasProgress = m.seenCount > 0

      const html = `
          <div style="
            position: relative;
            width: 48px;
            cursor: pointer;
            filter: drop-shadow(0 4px 10px rgba(65,55,43,0.28));
          ">
            <div style="
              width: 48px;
              height: 48px;
              border-radius: 14px;
              overflow: hidden;
              border: 3px solid ${hasProgress ? '#4256cc' : '#fffaf0'};
              background: #e7e1d6;
            ">
              ${m.previewImage
                ? `<img src="${escapeHtml(m.previewImage)}" alt="" style="width:100%;height:100%;object-fit:cover" />`
                : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#52525b;font-size:18px">🏛</div>`
              }
            </div>
            ${m.hasLoan ? `
              <div style="
                position: absolute;
                top: -3px;
                left: -3px;
                width: 15px;
                height: 15px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #d97706;
                border-radius: 999px;
                border: 1px solid rgba(0,0,0,0.35);
                color: white;
                font-size: 9px;
                line-height: 1;
              " title="${escapeHtml(labels.onLoanHint ?? '')}">⇄</div>
            ` : ''}
            ${hasProgress ? `
              <div style="
                position: absolute;
                bottom: -3px;
                right: -3px;
                background: #4256cc;
                border-radius: 999px;
                padding: 1px 4px;
                font-size: 9px;
                font-weight: 700;
                color: white;
                font-family: system-ui;
                border: 1px solid rgba(0,0,0,0.4);
              ">${pct}%</div>
            ` : ''}
            <div style="
              position: absolute;
              bottom: -7px;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 5px solid transparent;
              border-right: 5px solid transparent;
              border-top: 7px solid ${hasProgress ? '#4256cc' : '#fffaf0'};
            "></div>
          </div>
        `

      const icon = L.divIcon({
        html,
        className: '',
        iconSize: [48, 55],
        iconAnchor: [24, 55],
        popupAnchor: [0, -58],
      })

      const marker = L.marker([m.lat, m.lng], {
        icon,
        title: m.name,
        alt: `${labels.openMuseum}: ${m.name}`,
        keyboard: true,
      }).addTo(layer)

      // Popup
      const popupContent = `
          <a href="/museums/${m.id}" aria-label="${escapeHtml(labels.openMuseum)}: ${escapeHtml(m.name)}" style="display:block;text-decoration:none">
          <div style="
            background: #fffaf0;
            border: 1px solid rgba(65,55,43,0.12);
            border-radius: 14px;
            padding: 12px 14px;
            min-width: 160px;
            font-family: system-ui;
            box-shadow: 0 16px 36px rgba(65,55,43,0.16);
          ">
            <div style="font-family: Georgia,serif; font-weight: 700; color: #29251f; font-size: 14px; margin-bottom: 3px; line-height: 1.3">${escapeHtml(m.name)}</div>
            <div style="color: #8b8174; font-size: 11px; margin-bottom: 8px">${escapeHtml(m.city)}${m.country ? ', ' + escapeHtml(m.country) : ''}</div>
            <div style="display:flex;align-items:center;justify-content:space-between;font-size:11px">
              <span style="color:#6f665b">${m.artworkCount} ${escapeHtml(labels.works)}</span>
              ${m.seenCount > 0 ? `<span style="color:#4256cc;font-weight:700">${m.seenCount} ${escapeHtml(labels.seen)}</span>` : ''}
            </div>
            ${m.hasLoan && labels.onLoanHint ? `<div style="margin-top:6px;color:#b45309;font-size:10px">${escapeHtml(labels.onLoanHint)}</div>` : ''}
            <div style="margin-top:9px;color:#4256cc;font-size:11px;font-weight:700">${escapeHtml(labels.openMuseum)} →</div>
          </div>
          </a>
        `

      marker.bindPopup(popupContent, {
        className: 'museum-popup',
        closeButton: false,
        maxWidth: 220,
      })

      marker.on('click', () => {
        window.location.assign(`/museums/${m.id}`)
      })

      marker.on('mouseover', () => marker.openPopup())
    })

    const current = museumsRef.current
    if (current.length === 1) {
      map.setView([current[0].lat, current[0].lng], 7)
    } else if (current.length > 1) {
      map.fitBounds(L.latLngBounds(current.map((museum: MuseumPin) => [museum.lat, museum.lng])), {
        padding: [42, 42],
        maxZoom: compact ? 6 : 5,
      })
    }
  }

  return (
    <>
      <style>{`
        .museum-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .museum-popup .leaflet-popup-content {
          margin: 0 !important;
        }
        .museum-popup .leaflet-popup-tip-container {
          display: none !important;
        }
        .leaflet-control-attribution {
          background: rgba(255,250,240,0.82) !important;
          color: #8b8174 !important;
          font-size: 9px !important;
        }
        .leaflet-control-attribution a {
          color: #4256cc !important;
        }
        .leaflet-control-zoom a {
          background: #fffaf0 !important;
          color: #4256cc !important;
          border-color: rgba(65,55,43,0.12) !important;
        }
        .leaflet-control-zoom a:hover {
          background: #f3ecdf !important;
          color: #3447b8 !important;
        }
      `}</style>
      <div
        ref={mapRef}
        className="w-full overflow-hidden rounded-[1.5rem] bg-[#e7e1d6] ring-1 ring-black/5"
        style={{ height: compact ? 'min(62vh, 620px)' : '70vh', minHeight: compact ? 360 : 500 }}
      />
    </>
  )
}
