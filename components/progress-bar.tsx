'use client'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

interface ProgressBarProps {
  value: number
  seen: number
  total: number
  className?: string
  animate?: boolean
}

export default function ProgressBar({ value, seen, total, className, animate = true }: ProgressBarProps) {
  const [display, setDisplay] = useState(animate ? 0 : value)
  const t = useTranslations('Progress')

  useEffect(() => {
    if (!animate) return
    const timer = setTimeout(() => setDisplay(value), 100)
    return () => clearTimeout(timer)
  }, [value, animate])

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">{t('seenOf', { seen, total })}</span>
        <span className={cn('font-medium', value > 0 ? 'text-indigo-400' : 'text-zinc-600')}>{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${display}%`,
            background: display > 0
              ? 'linear-gradient(90deg, #6366f1, #8b5cf6)'
              : 'transparent'
          }}
        />
      </div>
    </div>
  )
}
