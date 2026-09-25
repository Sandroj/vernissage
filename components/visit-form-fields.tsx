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
  dateApprox?: boolean
  onDateApproxChange?: (value: boolean) => void
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
  dateApprox = false,
  onDateApproxChange,
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
      </div>

      {/* Datum */}
      <div className="space-y-1.5">
        <label className="text-xs text-stone-500 uppercase tracking-widest">{t('date')}</label>
        {dateApprox ? (
          <p className="flex h-10 items-center gap-2 rounded-md border border-black/10 bg-white/70 px-3 text-sm text-stone-600">
            <CalendarIcon size={14} className="text-stone-400" />
            {t('dateApproxNote')}
          </p>
        ) : (
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
        )}
        {onDateApproxChange && (
          <label className="flex items-center gap-2 pt-0.5 text-xs text-stone-500">
            <input
              type="checkbox"
              checked={dateApprox}
              onChange={(e) => onDateApproxChange(e.target.checked)}
              className="size-3.5 rounded border-black/20"
            />
            {t('dateApproxToggle')}
          </label>
        )}
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
