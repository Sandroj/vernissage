'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

export default function GlobalSearch({ compact = false }: { compact?: boolean }) {
  const t = useTranslations('Search')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const query = String(data.get('q') ?? '').trim()
    if (!query) return
    setOpen(false)
    router.push(`/search?q=${encodeURIComponent(query)}`)
  }

  if (compact) {
    return (
      <>
        <button onClick={() => setOpen(true)} className="grid size-9 place-items-center rounded-full border border-black/10 bg-white/70 text-stone-700" aria-label={t('open')}>
          <Search size={16} />
        </button>
        {open && <SearchOverlay t={t} inputRef={inputRef} submit={submit} close={() => setOpen(false)} />}
      </>
    )
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="hidden lg:flex h-10 w-[min(31vw,390px)] items-center gap-3 rounded-full border border-black/10 bg-white/65 px-4 text-sm text-stone-500 shadow-sm transition hover:bg-white hover:shadow-md">
        <Search size={15} />
        <span className="truncate">{t('placeholder')}</span>
        <kbd className="ml-auto rounded-md border border-black/10 bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-500">⌘K</kbd>
      </button>
      {open && <SearchOverlay t={t} inputRef={inputRef} submit={submit} close={() => setOpen(false)} />}
    </>
  )
}

type Translator = ReturnType<typeof useTranslations<'Search'>>

function SearchOverlay({ t, inputRef, submit, close }: { t: Translator; inputRef: React.RefObject<HTMLInputElement>; submit: (event: FormEvent<HTMLFormElement>) => void; close: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] bg-[#201d18]/45 p-4 pt-[15vh] backdrop-blur-md" onMouseDown={close}>
      <form onSubmit={submit} onMouseDown={(e) => e.stopPropagation()} className={cn('mx-auto max-w-2xl overflow-hidden rounded-[2rem] bg-[#fffdf8] p-3 shadow-2xl ring-1 ring-black/10')}>
        <div className="flex items-center gap-3 px-3">
          <Search className="text-[#4b5ed4]" size={21} />
          <input ref={inputRef} name="q" className="h-14 min-w-0 flex-1 bg-transparent text-lg text-stone-900 outline-none placeholder:text-stone-400" placeholder={t('placeholder')} autoComplete="off" />
          <button type="button" onClick={close} className="grid size-9 place-items-center rounded-full text-stone-500 hover:bg-stone-100"><X size={18} /></button>
        </div>
        <div className="mx-3 mt-1 flex flex-wrap gap-2 border-t border-black/8 px-1 pt-3 pb-1 text-xs text-stone-500">
          <span>{t('hint')}</span>
          <span className="ml-auto text-[#4b5ed4]">{t('submit')} ↵</span>
        </div>
      </form>
    </div>
  )
}
