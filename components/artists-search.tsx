'use client'
import { useRouter, usePathname } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { useTransition } from 'react'
import { useTranslations } from 'next-intl'

export default function ArtistsSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const t = useTranslations('Artists')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    startTransition(() => {
      router.push(`${pathname}${q ? `?q=${encodeURIComponent(q)}` : ''}`)
    })
  }

  return (
    <div className="paper-card relative rounded-2xl">
      <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4256cc]" />
      <Input
        defaultValue={defaultValue}
        onChange={handleChange}
        placeholder={t('searchPlaceholder')}
        className="h-13 rounded-2xl border-0 bg-transparent pl-11 text-stone-900 shadow-none placeholder:text-stone-400 focus-visible:ring-[#4256cc]/30"
      />
    </div>
  )
}
