'use client'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number   // 0–100
  seen: number
  total: number
  className?: string
  animate?: boolean
}

export default function ProgressBar({ value, seen, total, className, animate = true }: ProgressBarProps) {
  const [display, setDisplay] = useState(animate ? Math.max(0, value - 5) : value)

  useEffect(() => {
    if (!animate) return
    const timer = setTimeout(() => setDisplay(value), 50)
    return () => clearTimeout(timer)
  }, [value, animate])

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex justify-between text-xs text-slate-400">
        <span>{seen} van {total} gezien</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${display}%` }}
        />
      </div>
    </div>
  )
}
