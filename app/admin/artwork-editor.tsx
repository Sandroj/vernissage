'use client'

import { useEffect, useState } from 'react'

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

  return <section className="mt-10 max-w-5xl space-y-5 border-t border-stone-200 pt-8">
    <div><h2 className="font-display text-3xl text-stone-900">Werkgegevens beheren</h2><p className="mt-1 text-sm text-stone-500">Zoek een werk om gegevens en beeldbron bij te werken, of registreer een actuele bruikleen.</p></div>
    <div className="relative">
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Zoek op titel, kunstenaar of catalogusnummer…" className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm" />
      {results.length > 0 && <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-stone-200 bg-white shadow-xl">{results.map((item) => <button key={item.id} type="button" onClick={() => openArtwork(item.id)} className="block w-full border-b border-stone-100 px-4 py-3 text-left text-sm hover:bg-stone-50"><strong>{item.title}</strong><span className="ml-2 text-stone-500">{item.artist.name}{item.year_start ? ` · ${item.year_start}` : ''} · #{item.id}</span></button>)}</div>}
    </div>
    {notice && <p role="status" className="rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-700">{notice}</p>}
    {artwork && <>
      <form onSubmit={saveArtwork} className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:grid-cols-2">
        <h3 className="sm:col-span-2 text-lg font-semibold">{artwork.title} <span className="text-sm font-normal text-stone-500">· {artwork.artist.name} · #{artwork.id}</span></h3>
        <label className="sm:col-span-2 text-sm text-stone-600">Collectie-eigenaar / huidige museumkoppeling
          <select value={values.museumId ?? ''} onChange={(e) => setValues({ ...values, museumId: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-2.5"><option value="">Geen gekoppeld museum</option>{museums.map((museum) => <option key={museum.id} value={museum.id}>{museum.name} — {museum.city}</option>)}</select>
        </label>
        {textFields.map(([key, label]) => <label key={key} className="text-sm text-stone-600">{label}
          {key.includes('note') || key === 'alternate_titles' ? <textarea value={values[key] == null ? '' : String(values[key])} onChange={(e) => setValues({ ...values, [key]: e.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-stone-300 p-2.5" /> : <input type={key.startsWith('year_') ? 'number' : key === 'image_retrieved_at' ? 'date' : 'text'} value={values[key] ? String(values[key]).slice(0, 10) : ''} onChange={(e) => setValues({ ...values, [key]: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-300 p-2.5" />}
        </label>)}
        {values.image_url && <img src={String(values.image_url)} alt="Voorbeeld van de te koppelen afbeelding" className="sm:col-span-2 max-h-80 justify-self-start rounded-lg border border-stone-200 object-contain" />}
        <label className="sm:col-span-2 text-sm text-stone-600">Afbeelding uploaden (JPEG, PNG of WebP; max. 8 MB)
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(e) => uploadImage(e.target.files?.[0])} className="mt-1 block w-full text-sm" />
        </label>
        <button disabled={busy} className="w-fit rounded-lg bg-[#4256cc] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Gegevens opslaan</button>
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
