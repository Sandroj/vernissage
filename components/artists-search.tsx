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
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <Input
        defaultValue={defaultValue}
        onChange={handleChange}
        placeholder={t('searchPlaceholder')}
        className="pl-9 bg-slate-900 border-slate-700"
      />
    </div>
  )
}
