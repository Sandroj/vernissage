'use client'

import { useEffect, useState } from 'react'
import { Check, Image as ImageIcon, RotateCcw, Search, Upload, Save } from 'lucide-react'

type Museum = { id: number; name: string; city: string; country: string }
type Result = { id: number; title: string; year_start: number | null; artist: { name: string } }
type Loan = { id: number; current: boolean; fromOwnerName: string | null; fromMuseum: Museum | null; toMuseum: Museum; endAt: string | null; sourceUrl: string | null }
type Artwork = { [key: string]: unknown; id: number; title: string; museumId: number | null; artist: { name: string }; museum: Museum | null; loans: Loan[]; edits: { id: number; editorEmail: string; createdAt: string }[] }
type FormValues = Record<string, string | number | null>

const textFields = [
  ['title', 'Titel'], ['title_de', 'Duitse titel'], ['year_start', 'Jaar vanaf'], ['year_end', 'Jaar tot'],
  ['medium_raw', 'Materiaal / techniek'], ['type_normalized', 'Type'], ['dimensions_raw', 'Afmetingen'],
  ['source_name', 'Bron van werkgegevens'], ['source_url', 'Bronlink'], ['catalogue_id', 'Catalogusnummer'],
  ['jh_catalogue_id', 'JH-catalogusnummer'], ['alternate_titles', 'Alternatieve titels'],
  ['image_url', 'Afbeeldings-URL'], ['image_source_name', 'Afbeeldingsbron'], ['image_source_url', 'Bronlink afbeelding'],
  ['image_rights', 'Rechten / gebruiksnotitie'], ['image_retrieved_at', 'Afbeelding opgehaald op'], ['attribution_status', 'Toeschrijvingsstatus'],
  ['attribution_note', 'Toelichting toeschrijving (NL)'], ['attribution_note_en', 'Attribution note (EN)'],
] as const

const fieldGroups = [
  { title: 'Titel en identificatie', description: 'De titel die bezoekers zien, plus catalogus- en bronidentiteit.', fields: ['title', 'title_de', 'alternate_titles', 'catalogue_id', 'jh_catalogue_id', 'year_start', 'year_end'] },
  { title: 'Beschrijving en classificatie', description: 'Materiaal, type, afmetingen en eventuele toeschrijvingsnotitie.', fields: ['medium_raw', 'type_normalized', 'dimensions_raw', 'attribution_status', 'attribution_note', 'attribution_note_en'] },
  { title: 'Bron en afbeelding', description: 'Bewaar altijd waar de informatie en afbeelding vandaan komen.', fields: ['source_name', 'source_url', 'image_url', 'image_source_name', 'image_source_url', 'image_rights', 'image_retrieved_at'] },
] as const

export default function ArtworkEditor() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [artwork, setArtwork] = useState<Artwork | null>(null)
  const [museums, setMuseums] = useState<Museum[]>([])
  const [values, setValues] = useState<FormValues>({})
  const [busy, setBusy] = useState(false)
  const [fromMuseumId, setFromMuseumId] = useState('')
  const [fromOwnerName, setFromOwnerName] = useState('')
  const [toMuseumId, setToMuseumId] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [loanSource, setLoanSource] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => { fetch('/api/admin/museums').then((r) => r.ok ? r.json() : []).then(setMuseums) }, [])
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length < 2) { setResults([]); return }
      fetch(`/api/admin/artworks?q=${encodeURIComponent(query)}`).then((r) => r.ok ? r.json() : []).then(setResults)
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  async function openArtwork(id: number) {
    setBusy(true); setNotice('')
    const response = await fetch(`/api/admin/artworks/${id}`)
    const data = await response.json()
    setBusy(false)
    if (!response.ok) { setNotice(data.error ?? 'Werk laden mislukt'); return }
    setArtwork(data)
    const nextValues: FormValues = {}
    for (const [key] of textFields) nextValues[key] = data[key] ?? ''
    nextValues.museumId = data.museumId ?? ''
    setValues(nextValues)
    setQuery(`${String(data.title)} — ${data.artist.name}`)
    setResults([])
    setFromMuseumId(data.museumId ? String(data.museumId) : '')
  }

  async function saveArtwork(event: React.FormEvent) {
    event.preventDefault()
    if (!artwork) return
    setBusy(true); setNotice('')
    const payload: FormValues = { ...values, museumId: values.museumId || null }
    for (const field of ['year_start', 'year_end']) payload[field] = values[field] === '' ? null : Number(values[field])
    const response = await fetch(`/api/admin/artworks/${artwork.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await response.json()
    setBusy(false)
    if (!response.ok) { setNotice(data.error ?? 'Opslaan mislukt'); return }
    setNotice('Werkgegevens opgeslagen. De wijziging staat in de beheergeschiedenis.')
    await openArtwork(artwork.id)
  }

  async function uploadImage(file?: File) {
    if (!file) return
    setBusy(true); setNotice('Afbeelding uploaden…')
    const form = new FormData(); form.set('file', file)
    const response = await fetch('/api/admin/images', { method: 'POST', body: form })
    const data = await response.json()
    setBusy(false)
    if (!response.ok) { setNotice(data.error ?? 'Upload mislukt'); return }
    setValues((old) => ({ ...old, image_url: data.imageUrl, image_retrieved_at: new Date().toISOString().slice(0, 10) }))
    setNotice('Afbeelding staat in R2. Vul de bron en rechtennotitie in en sla het werk op.')
  }

  async function addLoan(event: React.FormEvent) {
    event.preventDefault()
    if (!artwork) return
    setBusy(true); setNotice('')
    const response = await fetch(`/api/admin/artworks/${artwork.id}/loans`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fromMuseumId: fromMuseumId || null, fromOwnerName, toMuseumId, startAt: startAt || null, endAt: endAt || null, sourceUrl: loanSource }) })
    const data = await response.json()
    setBusy(false)
    if (!response.ok) { setNotice(data.error ?? 'Uitleen opslaan mislukt'); return }
    setNotice('Actuele uitleen opgeslagen.')
    await openArtwork(artwork.id)
  }

  async function closeLoan(id: number) {
    if (!artwork) return
    setBusy(true)
    const response = await fetch(`/api/admin/loans/${id}`, { method: 'PATCH' })
    setBusy(false)
    if (response.ok) { setNotice('Uitleen beëindigd.'); await openArtwork(artwork.id) }
  }

  return <section className="mt-10 max-w-5xl space-y-6 border-t border-stone-200 pt-8">
    <div><p className="eyebrow mb-2">Redactie</p><h2 className="font-display text-3xl text-stone-900">Werkgegevens beheren</h2><p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-500">Zoek een bestaand werk, pas alleen de velden aan die je wilt overschrijven en bewaar de bron van iedere nieuwe afbeelding of bewering.</p></div>
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:p-5">
      <label className="text-xs font-semibold uppercase tracking-[.14em] text-stone-500">Bestaand werk zoeken</label>
      <div className="relative mt-2"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Titel, kunstenaar of catalogusnummer…" className="w-full rounded-xl border border-stone-300 bg-white py-3 pl-10 pr-4 text-sm shadow-sm" />
      {results.length > 0 && <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-stone-200 bg-white shadow-xl">{results.map((item) => <button key={item.id} type="button" onClick={() => openArtwork(item.id)} className="block w-full border-b border-stone-100 px-4 py-3 text-left text-sm hover:bg-stone-50"><strong>{item.title}</strong><span className="ml-2 text-stone-500">{item.artist.name}{item.year_start ? ` · ${item.year_start}` : ''} · #{item.id}</span></button>)}</div>}
      </div><p className="mt-2 text-xs text-stone-400">Kies een resultaat om het bestaande record te laden. Opslaan schrijft de gewijzigde velden naar datzelfde werk.</p>
    </div>
    {notice && <p role="status" className="rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-700">{notice}</p>}
    {artwork && <>
      <form onSubmit={saveArtwork} className="space-y-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-100 pb-4"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#4256cc]">Geselecteerd record · #{artwork.id}</p><h3 className="mt-1 font-display text-2xl text-stone-900">{artwork.title}</h3><p className="text-sm text-stone-500">{artwork.artist.name}</p></div><button type="button" onClick={() => { setArtwork(null); setResults([]); setQuery('') }} className="inline-flex items-center gap-2 rounded-lg border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50"><RotateCcw size={14} /> Ander werk kiezen</button></div>
        <label className="sm:col-span-2 text-sm text-stone-600">Collectie-eigenaar / huidige museumkoppeling
          <select value={values.museumId ?? ''} onChange={(e) => setValues({ ...values, museumId: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-2.5"><option value="">Geen gekoppeld museum</option>{museums.map((museum) => <option key={museum.id} value={museum.id}>{museum.name} — {museum.city}</option>)}</select>
        </label>
        {fieldGroups.map((group) => <div key={group.title} className="space-y-3"><div><h4 className="text-sm font-semibold text-stone-900">{group.title}</h4><p className="text-xs text-stone-400">{group.description}</p></div><div className="grid gap-4 sm:grid-cols-2">{group.fields.map((key) => { const label = textFields.find(([field]) => field === key)?.[1] ?? key; return <label key={key} className="text-sm text-stone-600">{label}
          {key.includes('note') || key === 'alternate_titles' ? <textarea value={values[key] == null ? '' : String(values[key])} onChange={(e) => setValues({ ...values, [key]: e.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-stone-300 p-2.5" /> : <input type={key.startsWith('year_') ? 'number' : key === 'image_retrieved_at' ? 'date' : 'text'} value={values[key] ? String(values[key]).slice(0, 10) : ''} onChange={(e) => setValues({ ...values, [key]: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-300 p-2.5" />}
        </label> })}</div></div>)}
        {values.image_url && <div className="rounded-xl border border-stone-200 bg-stone-50 p-3"><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-stone-500"><ImageIcon size={14} /> Voorbeeld opgeslagen afbeelding</div><img src={String(values.image_url)} alt="Voorbeeld van de te koppelen afbeelding" className="max-h-80 rounded-lg object-contain" /></div>}
        <label className="block rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600"><span className="flex items-center gap-2 font-semibold"><Upload size={15} /> Nieuwe afbeelding uploaden</span><span className="mt-1 block text-xs text-stone-400">JPEG, PNG of WebP tot 25 MB. Vernissage draait de afbeelding automatisch recht, schaalt tot 2400 px en comprimeert naar WebP.</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(e) => uploadImage(e.target.files?.[0])} className="mt-3 block w-full text-sm" /></label>
        <div className="flex flex-wrap items-center gap-3 border-t border-stone-100 pt-4"><button disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-[#4256cc] px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50"><Save size={15} /> {busy ? 'Bezig…' : 'Wijzigingen opslaan'}</button><span className="inline-flex items-center gap-1.5 text-xs text-stone-400"><Check size={14} className="text-emerald-600" /> Iedere opslag wordt gelogd</span></div>
      </form>
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <h3 className="text-lg font-semibold">Bruikleen</h3>
        {artwork.loans.map((loan) => <div key={loan.id} className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 p-3 text-sm"><span>{loan.current ? 'Nu bij' : 'Eerder bij'} <strong>{loan.toMuseum.name}</strong> · van {loan.fromMuseum?.name ?? loan.fromOwnerName ?? 'onbekende eigenaar'}{loan.endAt ? ` · t/m ${new Date(loan.endAt).toLocaleDateString()}` : ''}{loan.sourceUrl && <> · <a className="underline" href={loan.sourceUrl} target="_blank" rel="noreferrer">bron</a></>}</span>{loan.current && <button type="button" disabled={busy} onClick={() => closeLoan(loan.id)} className="text-xs font-semibold text-amber-900 underline">Bruikleen beëindigen</button>}</div>)}
        <form onSubmit={addLoan} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-stone-600">Uitlenend museum (of vul eigenaar in)<select value={fromMuseumId} onChange={(e) => setFromMuseumId(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-2.5"><option value="">Privé-eigenaar / anders</option>{museums.map((museum) => <option key={museum.id} value={museum.id}>{museum.name} — {museum.city}</option>)}</select></label>
          <label className="text-sm text-stone-600">Naam eigenaar indien geen museum<input value={fromOwnerName} onChange={(e) => setFromOwnerName(e.target.value)} placeholder="Bijv. particuliere collectie" className="mt-1 w-full rounded-lg border border-stone-300 p-2.5" /></label>
          <label className="text-sm text-stone-600">Ontvangend museum<select required value={toMuseumId} onChange={(e) => setToMuseumId(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-2.5"><option value="">Kies museum…</option>{museums.map((museum) => <option key={museum.id} value={museum.id}>{museum.name} — {museum.city}</option>)}</select></label>
          <label className="text-sm text-stone-600">Bron / bevestiging URL<input type="url" value={loanSource} onChange={(e) => setLoanSource(e.target.value)} placeholder="https://…" className="mt-1 w-full rounded-lg border border-stone-300 p-2.5" /></label>
          <label className="text-sm text-stone-600">Startdatum<input type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 p-2.5" /></label>
          <label className="text-sm text-stone-600">Einddatum<input type="date" value={endAt} onChange={(e) => setEndAt(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 p-2.5" /></label>
          <button disabled={busy} className="w-fit rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 disabled:opacity-50">Bruikleen registreren</button>
        </form>
      </div>
      <div className="text-xs text-stone-500">Recente aanpassingen: {artwork.edits.length ? artwork.edits.map((edit) => `${new Date(edit.createdAt).toLocaleDateString()} · ${edit.editorEmail}`).join(' / ') : 'nog geen'}</div>
    </>}
  </section>
}
