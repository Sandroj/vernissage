'use client'
import { useState, useEffect } from 'react'
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { MapPin } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface Museum { id: number; name: string; city: string }

interface MuseumSearchProps {
  value: string
  onChange: (value: string) => void
}

export default function MuseumSearch({ value, onChange }: MuseumSearchProps) {
  const t = useTranslations('MuseumSearch')
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Museum[]>([])

  useEffect(() => {
    if (query.length < 1) { setResults([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/museums?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(data)
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-start gap-2 text-left font-normal bg-white/70 border-black/10 text-stone-800 hover:bg-white"
          />
        }
      >
        <MapPin size={14} className="text-stone-400 flex-shrink-0" />
        <span className={value ? 'text-stone-800' : 'text-stone-400'}>
          {value || t('trigger')}
        </span>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[320px]" align="start">
        <Command>
          <CommandInput
            placeholder={t('placeholder')}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              <button
                className="px-3 py-2 text-sm text-stone-500 w-full text-left hover:bg-stone-100 rounded-lg"
                onClick={() => { onChange(query); setOpen(false) }}
              >
                {t('useAsLocation', { query })}
              </button>
            </CommandEmpty>
            {results.map((m) => (
              <CommandItem
                key={m.id}
                value={`${m.name} ${m.city}`}
                onSelect={() => { onChange(`${m.name}, ${m.city}`); setOpen(false) }}
              >
                <MapPin size={13} className="mr-2 text-stone-400" />
                <span>{m.name}</span>
                <span className="ml-auto text-stone-400 text-xs">{m.city}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
