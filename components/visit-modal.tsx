'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import VisitFormFields from '@/components/visit-form-fields'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

interface VisitModalProps {
  artworkId: number
  artworkTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export default function VisitModal({ artworkId, artworkTitle, open, onOpenChange, onSaved }: VisitModalProps) {
  const [date, setDate] = useState<Date>(new Date())
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [photoUrl, setPhotoUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const t = useTranslations('VisitModal')

  async function handleSave() {
    setSaving(true)
    const res = await fetch('/api/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artworkId,
        dateSeen: date.toISOString(),
        locationSeen: location || null,
        notes: notes || null,
        rating,
        photo_url: photoUrl || null,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      toast.error(t('saveError'))
      return
    }
    setDate(new Date())
    setLocation('')
    setNotes('')
    setRating(null)
    setPhotoUrl('')
    onOpenChange(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-2xl bg-[#faf6ee] border-black/10 p-5 sm:max-w-md sm:rounded-2xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium text-stone-900">{t('title')}</DialogTitle>
          <p className="max-w-full break-words text-stone-500 text-sm">{artworkTitle}</p>
        </DialogHeader>

        <div className="pt-2">
          <VisitFormFields
            date={date}
            onDateChange={setDate}
            locationValue={location}
            onLocationChange={setLocation}
            rating={rating}
            onRatingChange={setRating}
            notes={notes}
            onNotesChange={setNotes}
            photoUrl={photoUrl}
            onPhotoUrlChange={setPhotoUrl}
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
