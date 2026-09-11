'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface MuseumPin {
  id: number
  name: string
  city: string
  country: string
  lat: number
  lng: number
  artworkCount: number
  previewImage: string | null
  seenCount: number
}

interface MuseumMapProps {
  museums: MuseumPin[]
  labels: { works: string; seen: string }
}

export default function MuseumMap({ museums, labels }: MuseumMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<unknown>(null)
  const router = useRouter()

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Dynamically import Leaflet (client-only)
    import('leaflet').then((L) => {
      // Fix default marker icon path issues with webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current!, {
        center: [30, 15],
        zoom: 3,
        zoomControl: true,
        scrollWheelZoom: true,
      })

      mapInstanceRef.current = map

      // Dark CartoDB tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map)

      // Add museum markers
      museums.forEach((m) => {
        const pct = m.artworkCount > 0 ? Math.round((m.seenCount / m.artworkCount) * 100) : 0
        const hasProgress = m.seenCount > 0

        const html = `
          <div style="
            position: relative;
            width: 48px;
            cursor: pointer;
            filter: drop-shadow(0 3px 8px rgba(0,0,0,0.6));
          ">
            <div style="
              width: 48px;
              height: 48px;
              border-radius: 10px;
              overflow: hidden;
              border: 2px solid ${hasProgress ? '#6366f1' : 'rgba(255,255,255,0.25)'};
              background: #1c1c1e;
            ">
              ${m.previewImage
                ? `<img src="${m.previewImage}" style="width:100%;height:100%;object-fit:cover" />`
                : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#52525b;font-size:18px">🏛</div>`
              }
            </div>
            ${hasProgress ? `
              <div style="
                position: absolute;
                bottom: -3px;
                right: -3px;
                background: #6366f1;
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
              border-top: 7px solid ${hasProgress ? '#6366f1' : 'rgba(255,255,255,0.25)'};
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

        const marker = L.marker([m.lat, m.lng], { icon }).addTo(map)

        // Popup
        const popupContent = `
          <div style="
            background: #18181b;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 10px;
            padding: 10px 12px;
            min-width: 160px;
            font-family: system-ui;
          ">
            <div style="font-weight: 600; color: #fff; font-size: 13px; margin-bottom: 2px; line-height: 1.3">${m.name}</div>
            <div style="color: #71717a; font-size: 11px; margin-bottom: 8px">${m.city}${m.country ? ', ' + m.country : ''}</div>
            <div style="display:flex;align-items:center;justify-content:space-between;font-size:11px">
              <span style="color:#a1a1aa">${m.artworkCount} ${labels.works}</span>
              ${m.seenCount > 0 ? `<span style="color:#818cf8;font-weight:600">${m.seenCount} ${labels.seen}</span>` : ''}
            </div>
          </div>
        `

        marker.bindPopup(popupContent, {
          className: 'museum-popup',
          closeButton: false,
          maxWidth: 220,
        })

        marker.on('click', () => {
          router.push(`/museums/${m.id}`)
        })

        marker.on('mouseover', () => marker.openPopup())
        marker.on('mouseout', () => marker.closePopup())
      })
    })

    return () => {
      if (mapInstanceRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(mapInstanceRef.current as any).remove()
        mapInstanceRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
          background: rgba(0,0,0,0.5) !important;
          color: #52525b !important;
          font-size: 9px !important;
        }
        .leaflet-control-attribution a {
          color: #71717a !important;
        }
        .leaflet-control-zoom a {
          background: #27272a !important;
          color: #a1a1aa !important;
          border-color: rgba(255,255,255,0.1) !important;
        }
        .leaflet-control-zoom a:hover {
          background: #3f3f46 !important;
          color: #fff !important;
        }
      `}</style>
      <div ref={mapRef} className="w-full rounded-2xl overflow-hidden" style={{ height: '70vh', minHeight: 500 }} />
    </>
  )
}
