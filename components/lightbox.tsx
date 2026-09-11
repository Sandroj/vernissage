'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { X, ExternalLink } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface LightboxMeta {
  title: string
  artist?: string
  artistSlug?: string
  year?: number | null
  medium?: string | null
  dimensions?: string | null
  museum?: string | null
  museumCity?: string | null
  artworkHref?: string
}

interface LightboxProps {
  src: string
  alt: string
  onClose: () => void
  meta?: LightboxMeta
}

export default function Lightbox({ src, alt, onClose, meta }: LightboxProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const hasMeta = !!meta
  const t = useTranslations('Lightbox')

  return (
    <div
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Sluitknop */}
      <button
        className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-10"
        onClick={onClose}
        aria-label={t('close')}
      >
        <X size={24} />
      </button>

      {hasMeta ? (
        /* Layout met metadata: beeld links, info rechts */
        <div
          className="flex flex-col lg:flex-row items-center lg:items-stretch gap-6 max-w-6xl w-full max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Afbeelding */}
          <div className="flex-1 flex items-center justify-center min-h-0">
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[65vh] lg:max-h-[88vh] object-contain rounded-xl"
            />
          </div>

          {/* Metadata paneel */}
          <div className="w-full lg:w-64 lg:flex-shrink-0 flex flex-col gap-4 lg:py-2 lg:justify-center">
            {/* Titel + kunstenaar */}
            <div>
              <h2 className="text-white font-semibold text-lg leading-snug">{meta.title}</h2>
              {meta.artist && (
                <p className="text-zinc-400 text-sm mt-1">
                  {meta.artistSlug ? (
                    <Link
                      href={`/artists/${meta.artistSlug}`}
                      className="hover:text-indigo-400 transition-colors"
                      onClick={onClose}
                    >
                      {meta.artist}
                    </Link>
                  ) : meta.artist}
                  {meta.year && <span className="text-zinc-600"> · {meta.year}</span>}
                </p>
              )}
            </div>

            {/* Meta rijen */}
            <div className="space-y-3 border-t border-white/10 pt-3">
              {meta.medium && <MetaRow label={t('medium')} value={meta.medium} />}
              {meta.dimensions && <MetaRow label={t('dimensions')} value={meta.dimensions} />}
              {meta.museum && (
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-widest mb-0.5">{t('location')}</p>
                  <p className="text-white text-sm">{meta.museum}</p>
                  {meta.museumCity && <p className="text-zinc-500 text-xs">{meta.museumCity}</p>}
                </div>
              )}
            </div>

            {/* Link naar volledig detailpagina */}
            {meta.artworkHref && (
              <Link
                href={meta.artworkHref}
                onClick={onClose}
                className="mt-auto flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white border border-white/10 hover:border-white/20 rounded-lg px-3 py-2 transition-colors"
              >
                <ExternalLink size={12} />
                {t('fullDetails')}
              </Link>
            )}
          </div>
        </div>
      ) : (
        /* Fallback: alleen beeld, geen metadata */
        <div
          className="max-w-[90vw] max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={src}
            alt={alt}
            className="max-w-[90vw] max-h-[90vh] object-contain"
          />
        </div>
      )}
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-zinc-500 text-xs uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-white text-sm leading-snug">{value}</p>
    </div>
  )
}
