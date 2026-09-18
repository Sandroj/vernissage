'use client'
import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { CalendarIcon } from 'lucide-react'
import MuseumSearch from '@/components/museum-search'
import StarRating from '@/components/star-rating'
import { compressImageDataUrl } from '@/lib/image-compress'
import { useTranslations, useFormatter } from 'next-intl'
import { toast } from 'sonner'

// Large phone photos that fail to decode/compress fall back to their
// original (uncompressed) data-URL in lib/image-compress.ts — reject
// pathologically large files up front so that path can't blow past request
// body limits (Finding C).
const MAX_PHOTO_FILE_SIZE = 15 * 1024 * 1024

interface VisitFormFieldsProps {
  date: Date
  onDateChange: (date: Date) => void
  locationValue: string
  onLocationChange: (value: string) => void
  rating: number | null
  onRatingChange: (value: number | null) => void
  notes: string
  onNotesChange: (value: string) => void
  photoUrl: string
  onPhotoUrlChange: (value: string) => void
}

export default function VisitFormFields({
  date,
  onDateChange,
  locationValue,
  onLocationChange,
  rating,
  onRatingChange,
  notes,
  onNotesChange,
  photoUrl,
  onPhotoUrlChange,
}: VisitFormFieldsProps) {
  const [calOpen, setCalOpen] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [urlDraft, setUrlDraft] = useState('')
  const t = useTranslations('VisitForm')
  const fmt = useFormatter()

  async function handleFileSelected(file: File) {
    if (file.size > MAX_PHOTO_FILE_SIZE) {
      toast.error(t('photoTooLarge'))
      return
    }
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const raw = ev.target?.result as string
      setCompressing(true)
      const compressed = await compressImageDataUrl(raw)
      setCompressing(false)
      onPhotoUrlChange(compressed)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-4">
      {/* Foto — bovenaan en groot, het centrale element van de flow */}
      <div className="space-y-2">
        <div className="text-center">
          <p className="text-base font-medium text-stone-800">{t('photo')}</p>
          <p className="text-xs text-stone-500">{t('photoHint')}</p>
        </div>

        {photoUrl ? (
          <div className="relative">
            <img src={photoUrl} alt={t('photoPreview')} className="w-full h-56 object-cover rounded-2xl" />
            <button
              type="button"
              onClick={() => onPhotoUrlChange('')}
              aria-label={t('removePhoto')}
              className="absolute top-2 right-2 bg-black/70 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-black/90"
            >
              ×
            </button>
          </div>
        ) : (
          <label className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#ed694c]/40 bg-[#ed694c]/5 cursor-pointer transition-colors text-sm text-[#ed694c] hover:border-[#ed694c]/70 hover:bg-[#ed694c]/10">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileSelected(file)
              }}
            />
            <span className="text-2xl">📷</span>
            <span>{compressing ? t('compressing') : t('photoUpload')}</span>
          </label>
        )}

        {!photoUrl && (
          <input
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onBlur={() => { if (urlDraft.trim()) onPhotoUrlChange(urlDraft.trim()) }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              if (urlDraft.trim()) onPhotoUrlChange(urlDraft.trim())
            }}
            placeholder={t('photoUrlPlaceholder')}
            className="w-full bg-white/70 border border-black/10 rounded-lg px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#4256cc]/40"
          />
        )}
      </div>

      {/* Datum */}
      <div className="space-y-1.5">
        <label className="text-xs text-stone-500 uppercase tracking-widest">{t('date')}</label>
        <Popover open={calOpen} onOpenChange={setCalOpen}>
          <PopoverTrigger
            render={
              <Button variant="outline" className="h-10 w-full justify-start gap-2 px-3 bg-white/70 border-black/10 text-stone-800 hover:bg-white focus-visible:ring-1 focus-visible:ring-[#4256cc]/40" />
            }
          >
            <CalendarIcon size={14} className="text-stone-500" />
            {fmt.dateTime(date, { day: 'numeric', month: 'long', year: 'numeric' })}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => { if (d) { onDateChange(d); setCalOpen(false) } }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Locatie */}
      <div className="space-y-1.5">
        <label className="text-xs text-stone-500 uppercase tracking-widest">{t('location')}</label>
        <MuseumSearch value={locationValue} onChange={onLocationChange} />
      </div>

      {/* Waardering */}
      <div className="space-y-1.5">
        <label className="text-xs text-stone-500 uppercase tracking-widest">{t('rating')}</label>
        <StarRating value={rating} onChange={onRatingChange} />
      </div>

      {/* Notitie */}
      <div className="space-y-1.5">
        <label className="text-xs text-stone-500 uppercase tracking-widest">{t('notes')}</label>
        <Textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={t('notesPlaceholder')}
          className="bg-white/70 border-black/10 text-stone-800 resize-none placeholder:text-stone-400"
          rows={3}
        />
      </div>
    </div>
  )
}
