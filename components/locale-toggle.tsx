'use client'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { setLocale } from '@/i18n/actions'
import { LOCALES, type Locale } from '@/i18n/config'
import { cn } from '@/lib/utils'

export default function LocaleToggle({ className }: { className?: string }) {
  const locale = useLocale()
  const t = useTranslations('Locale')
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function choose(next: Locale) {
    if (next === locale) return
    startTransition(async () => { await setLocale(next); router.refresh() })
  }

  return (
    <div role="group" aria-label={t('label')} className={cn('flex items-center overflow-hidden rounded-full border border-black/10 bg-white/50 text-xs', className)}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => choose(l)}
          disabled={pending}
          aria-pressed={l === locale}
          className={cn('px-2.5 py-1.5 transition-colors', l === locale ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-900')}
        >
          {t(l)}
        </button>
      ))}
    </div>
  )
}
