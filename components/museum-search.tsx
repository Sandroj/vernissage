'use client'
import { useState, useEffect } from 'react'
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { MapPin } from 'lucide-react'

interface Museum { id: number; name: string; city: string }

interface MuseumSearchProps {
  value: string
  onChange: (value: string) => void
}

export default function MuseumSearch({ value, onChange }: MuseumSearchProps) {
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
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-start gap-2 text-left font-normal bg-slate-900 border-slate-700"
        >
          <MapPin size={14} className="text-slate-400 flex-shrink-0" />
          <span className={value ? 'text-white' : 'text-slate-400'}>
            {value || 'Zoek museum of typ locatie...'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[320px]" align="start">
        <Command>
          <CommandInput
            placeholder="Zoek museum..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              <button
                className="px-3 py-2 text-sm text-slate-300 w-full text-left hover:bg-slate-800"
                onClick={() => { onChange(query); setOpen(false) }}
              >
                Gebruik &ldquo;{query}&rdquo; als locatie
              </button>
            </CommandEmpty>
            {results.map((m) => (
              <CommandItem
                key={m.id}
                value={`${m.name} ${m.city}`}
                onSelect={() => { onChange(`${m.name}, ${m.city}`); setOpen(false) }}
              >
                <MapPin size={13} className="mr-2 text-slate-400" />
                <span>{m.name}</span>
                <span className="ml-auto text-slate-400 text-xs">{m.city}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
