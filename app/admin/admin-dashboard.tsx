'use client'

import { useState } from 'react'
import { Database, PencilLine } from 'lucide-react'
import ImportClient from './import-client'
import ArtworkEditor from './artwork-editor'

export default function AdminDashboard() {
  const [tab, setTab] = useState<'edit' | 'import'>('edit')

  return (
    <div className="max-w-6xl">
      <div className="mb-7">
        <p className="eyebrow mb-2">Vernissage redactie</p>
        <h1 className="font-display text-5xl font-medium tracking-tight text-stone-900">Beheer</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">Werk bestaande catalogusrecords bij, verbeter afbeeldingen en leg bruiklenen vast. Bulkimport is beschikbaar als aparte onderhoudstaak.</p>
      </div>

      <div className="mb-8 flex flex-wrap gap-2 rounded-2xl border border-stone-200 bg-stone-100 p-1.5" role="tablist" aria-label="Beheersecties">
        <button type="button" role="tab" aria-selected={tab === 'edit'} onClick={() => setTab('edit')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${tab === 'edit' ? 'bg-white text-[#4256cc] shadow-sm' : 'text-stone-500 hover:bg-white/70 hover:text-stone-800'}`}><PencilLine size={16} /> Werk bewerken</button>
        <button type="button" role="tab" aria-selected={tab === 'import'} onClick={() => setTab('import')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${tab === 'import' ? 'bg-white text-[#4256cc] shadow-sm' : 'text-stone-500 hover:bg-white/70 hover:text-stone-800'}`}><Database size={16} /> Importeren</button>
      </div>

      {tab === 'edit' ? <ArtworkEditor /> : <ImportClient />}
    </div>
  )
}
