'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import VisitModal from '@/components/visit-modal'
import { useTranslations, useFormatter } from 'next-intl'

interface Visit {
  id: number
  dateSeen: string
  locationSeen: string | null
  notes: string | null
  photo_url: string | null
}

interface VisitHistoryProps {
  artworkId: number
  artworkTitle: string
  isPlus: boolean
}

export default function VisitHistory({ artworkId, artworkTitle, isPlus }: VisitHistoryProps) {
  const [visits, setVisits] = useState<Visit[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const t = useTranslations('VisitHistory')
  const fmt = useFormatter()

  async function refresh() {
    const res = await fetch(`/api/visits?artworkId=${artworkId}`)
    if (res.ok) setVisits(await res.json())
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artworkId])

  async function handleDelete(id: number) {
    const res = await fetch(`/api/visits/${id}`, { method: 'DELETE' })
    if (res.ok) refresh()
  }

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-black/10 bg-white/50 p-4">
      <p className="text-xs text-stone-500 uppercase tracking-widest">{t('title')}</p>

      {visits.length > 0 && (
        <ul className="space-y-2">
          {visits.map((visit) => (
            <li key={visit.id} className="flex items-start justify-between gap-3 rounded-xl bg-white/70 p-3">
              <div className="flex items-center gap-3">
                {visit.photo_url && (
                  <img src={visit.photo_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                )}
                <div>
                  <p className="text-sm text-stone-800">{fmt.dateTime(new Date(visit.dateSeen), { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  {visit.locationSeen && <p className="text-xs text-stone-500">{visit.locationSeen}</p>}
                </div>
              </div>
              {isPlus && (
                <button
                  type="button"
                  onClick={() => handleDelete(visit.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  {t('deleteVisit')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isPlus ? (
        <Button
          variant="outline"
          onClick={() => setModalOpen(true)}
          className="h-9 w-full rounded-full border-black/10 bg-white/70 text-xs text-stone-800 hover:bg-white"
        >
          {t('addVisit')}
        </Button>
      ) : (
        <div className="space-y-2 rounded-xl bg-[#ed694c]/5 p-3">
          <p className="text-sm font-medium text-stone-800">{t('upsellTitle')}</p>
          <p className="text-xs text-stone-600">{t('upsellBody')}</p>
          <Button
            onClick={async () => {
              const res = await fetch('/api/billing/checkout', { method: 'POST' })
              const data = await res.json()
              if (data.url) window.location.href = data.url
            }}
            className="h-9 w-full rounded-full bg-[#ed694c] hover:bg-[#db573c] border-0 text-xs text-white"
          >
            {t('upgradeButton')}
          </Button>
        </div>
      )}

      <VisitModal
        artworkId={artworkId}
        artworkTitle={artworkTitle}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSaved={refresh}
      />
    </div>
  )
}
