'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import VisitFormFields from '@/components/visit-form-fields'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

interface SeenModalProps {
  artworkId: number
  artworkTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
  existingSeen?: {
    id: number
    dateSeen: string
    dateApprox?: boolean
    locationSeen?: string | null
    notes?: string | null
    rating?: number | null
    photo_url?: string | null
  } | null
  hasVisits?: boolean
  onSaved: () => void
  onRemoved: () => void
}

export default function SeenModal({
  artworkId,
  artworkTitle,
  open,
  onOpenChange,
  existingSeen,
  hasVisits,
  onSaved,
  onRemoved,
}: SeenModalProps) {
  const [date, setDate] = useState<Date>(
    existingSeen ? new Date(existingSeen.dateSeen) : new Date()
  )
  const [dateApprox, setDateApprox] = useState(existingSeen?.dateApprox ?? false)
  const [location, setLocation] = useState(existingSeen?.locationSeen ?? '')
  const [notes, setNotes] = useState(existingSeen?.notes ?? '')
  const [rating, setRating] = useState<number | null>(existingSeen?.rating ?? null)
  const [photoUrl, setPhotoUrl] = useState(existingSeen?.photo_url ?? '')
  const [photoTouched, setPhotoTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const t = useTranslations('SeenModal')

  async function handleSave() {
    setSaving(true)
    const res = await fetch('/api/seen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artworkId,
        dateSeen: date.toISOString(),
        dateApprox,
        locationSeen: location || null,
        notes: notes || null,
        rating,
        ...(photoTouched ? { photo_url: photoUrl || null } : {}),
      }),
    })
    setSaving(false)
    if (!res.ok) {
      toast.error(t('saveError'))
      return
    }
    onOpenChange(false)
    onSaved()
  }

  function handlePhotoUrlChange(value: string) {
    setPhotoTouched(true)
    setPhotoUrl(value)
  }

  async function handleRemove() {
    if (hasVisits && !window.confirm(t('confirmUnmarkWithVisits'))) return
    setSaving(true)
    const res = await fetch('/api/seen', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artworkId }),
    })
    setSaving(false)
    if (!res.ok) return
    onOpenChange(false)
    onRemoved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-2xl bg-[#faf6ee] border-black/10 p-5 sm:max-w-md sm:rounded-2xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium text-stone-900">
            {existingSeen ? t('editTitle') : t('newTitle')}
          </DialogTitle>
          <p className="max-w-full break-words text-stone-500 text-sm">{artworkTitle}</p>
          {existingSeen && (
            <Button type="button" variant="outline" onClick={handleRemove} disabled={saving} className="mt-1 h-9 w-full rounded-full border-red-200 bg-red-50/50 text-xs text-red-700 hover:bg-red-50">
              {t('removeSeen')}
            </Button>
          )}
        </DialogHeader>

        <div className="pt-2">
          <VisitFormFields
            date={date}
            onDateChange={setDate}
            dateApprox={dateApprox}
            onDateApproxChange={setDateApprox}
            locationValue={location}
            onLocationChange={setLocation}
            rating={rating}
            onRatingChange={setRating}
            notes={notes}
            onNotesChange={setNotes}
            photoUrl={photoUrl}
            onPhotoUrlChange={handlePhotoUrlChange}
          />

          <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-between">
            <Button onClick={handleSave} disabled={saving} className="h-11 flex-1 rounded-full bg-[#ed694c] hover:bg-[#db573c] border-0 text-white">
              {saving ? t('saving') : t('save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
