'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon } from 'lucide-react'
import MuseumSearch from '@/components/museum-search'
import StarRating from '@/components/star-rating'
import { useTranslations, useFormatter } from 'next-intl'

interface SeenModalProps {
  artworkId: number
  artworkTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
  existingSeen?: {
    id: number
    dateSeen: string
    locationSeen?: string | null
    notes?: string | null
    rating?: number | null
    photo_url?: string | null
  } | null
  onSaved: () => void
}

export default function SeenModal({
  artworkId,
  artworkTitle,
  open,
  onOpenChange,
  existingSeen,
  onSaved,
}: SeenModalProps) {
  const [date, setDate] = useState<Date>(
    existingSeen ? new Date(existingSeen.dateSeen) : new Date()
  )
  const [calOpen, setCalOpen] = useState(false)
  const [location, setLocation] = useState(existingSeen?.locationSeen ?? '')
  const [notes, setNotes] = useState(existingSeen?.notes ?? '')
  const [rating, setRating] = useState<number | null>(existingSeen?.rating ?? null)
  const [photoUrl, setPhotoUrl] = useState(existingSeen?.photo_url ?? '')
  const [saving, setSaving] = useState(false)
  const t = useTranslations('SeenModal')
  const fmt = useFormatter()

  async function handleSave() {
    setSaving(true)
    await fetch('/api/seen', {
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
    onOpenChange(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-white/10 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            {existingSeen ? t('editTitle') : t('newTitle')}
          </DialogTitle>
          <p className="text-zinc-500 text-sm">{artworkTitle}</p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Datum */}
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-500 uppercase tracking-widest">{t('date')}</label>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger
                render={
                  <Button variant="outline" className="w-full justify-start gap-2 bg-zinc-900 border-white/10 text-white hover:bg-zinc-800" />
                }
              >
                <CalendarIcon size={14} />
                {fmt.dateTime(date, { day: 'numeric', month: 'long', year: 'numeric' })}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => { if (d) { setDate(d); setCalOpen(false) } }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Locatie */}
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-500 uppercase tracking-widest">{t('location')}</label>
            <MuseumSearch value={location} onChange={setLocation} />
          </div>

          {/* Waardering */}
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-500 uppercase tracking-widest">{t('rating')}</label>
            <StarRating value={rating} onChange={setRating} />
          </div>

          {/* Notitie */}
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-500 uppercase tracking-widest">{t('notes')}</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('notesPlaceholder')}
              className="bg-zinc-900 border-white/10 text-white resize-none placeholder:text-zinc-600"
              rows={3}
            />
          </div>

          {/* Foto */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-500 uppercase tracking-widest">{t('photo')}</label>

            {/* File upload */}
            <div className="space-y-2">
              <label className="flex items-center justify-center gap-2 border border-dashed border-white/10 hover:border-white/20 rounded-xl p-4 cursor-pointer transition-colors text-sm text-zinc-500 hover:text-zinc-300">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = (ev) => setPhotoUrl(ev.target?.result as string)
                    reader.readAsDataURL(file)
                  }}
                />
                {t('photoUpload')}
              </label>

              {photoUrl && (
                <div className="relative">
                  <img src={photoUrl} alt={t('photoPreview')} className="w-full h-24 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => setPhotoUrl('')}
                    aria-label={t('removePhoto')}
                    className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/90"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* URL fallback */}
              {!photoUrl && (
                <input
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder={t('photoUrlPlaceholder')}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                />
              )}
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-500 border-0 text-white">
            {saving ? t('saving') : t('save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
