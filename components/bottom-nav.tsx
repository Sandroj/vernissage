'use client'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function BottomNav() {
  const router = useRouter()

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="mx-auto flex max-w-xs items-center justify-center gap-2 rounded-full border border-black/[0.08] bg-[#f8f3e9]/92 px-2 py-2 shadow-[0_12px_36px_-10px_rgba(67,51,29,.3)] backdrop-blur-2xl">
        <button
          onClick={() => router.back()}
          aria-label="Vorige pagina"
          className="grid size-11 place-items-center rounded-full text-stone-700 hover:bg-black/5"
        >
          <ChevronLeft size={22} />
        </button>
        <button
          onClick={() => router.forward()}
          aria-label="Volgende pagina"
          className="grid size-11 place-items-center rounded-full text-stone-700 hover:bg-black/5"
        >
          <ChevronRight size={22} />
        </button>
      </div>
    </div>
  )
}
