'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import MuseumSearch from '@/components/museum-search'
import StarRating from '@/components/star-rating'

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
      <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            {existingSeen ? 'Bewerk' : 'Markeer als gezien'}
          </DialogTitle>
          <p className="text-slate-400 text-sm">{artworkTitle}</p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Datum */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400 uppercase tracking-wide">Datum</label>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2 bg-slate-800 border-slate-700 text-white">
                  <CalendarIcon size={14} />
                  {format(date, 'd MMMM yyyy', { locale: nl })}
                </Button>
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
          <div className="space-y-1">
            <label className="text-xs text-slate-400 uppercase tracking-wide">Locatie</label>
            <MuseumSearch value={location} onChange={setLocation} />
          </div>

          {/* Waardering */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400 uppercase tracking-wide">Waardering</label>
            <StarRating value={rating} onChange={setRating} />
          </div>

          {/* Notitie */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400 uppercase tracking-wide">Notitie</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Wat vond je van dit werk?"
              className="bg-slate-800 border-slate-700 text-white resize-none"
              rows={3}
            />
          </div>

          {/* Foto URL */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400 uppercase tracking-wide">Foto (optioneel)</label>
            <Input
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="URL van een foto die je maakte"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Opslaan...' : 'Opslaan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
