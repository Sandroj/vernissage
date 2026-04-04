'use client'
import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  value: number | null
  onChange: (rating: number) => void
}

export default function StarRating({ value, onChange }: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null)

  return (
    <div className="flex gap-1" role="group" aria-label="Waardering">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(null)}
          className="focus:outline-none"
          aria-label={`${star} ster${star !== 1 ? 'ren' : ''}`}
        >
          <Star
            size={20}
            className={cn(
              'transition-colors',
              (hover ?? value ?? 0) >= star
                ? 'fill-amber-400 text-amber-400'
                : 'text-slate-600'
            )}
          />
        </button>
      ))}
    </div>
  )
}
