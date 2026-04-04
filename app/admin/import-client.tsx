'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

export default function ImportClient() {
  const [jsonData, setJsonData] = useState('')
  const [importing, setImporting] = useState(false)
  const [artistName, setArtistName] = useState('')
  const [artworkTitle, setArtworkTitle] = useState('')
  const [artworkYear, setArtworkYear] = useState('')

  async function handleImport() {
    setImporting(true)
    try {
      const parsed = JSON.parse(jsonData)
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ works: parsed }),
      })
      const data = await res.json()
      if (res.ok) {
        toast(`${data.imported} werken geïmporteerd`)
        setJsonData('')
      } else {
        toast.error(data.error ?? 'Import mislukt')
      }
    } catch {
      toast.error('Ongeldige JSON')
    }
    setImporting(false)
  }

  async function handleAddArtwork() {
    if (!artistName || !artworkTitle) return
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        works: [{
          artist: artistName,
          title: artworkTitle,
          year_start: artworkYear ? parseInt(artworkYear) : null,
        }],
      }),
    })
    if (res.ok) {
      toast('Werk toegevoegd')
      setArtworkTitle('')
      setArtworkYear('')
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Beheer</h1>

      <Tabs defaultValue="import">
        <TabsList className="bg-slate-900">
          <TabsTrigger value="import">Scraper import</TabsTrigger>
          <TabsTrigger value="manual">Handmatig toevoegen</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4 pt-4">
          <p className="text-slate-400 text-sm">
            Plak JSON-output van een scraper (array van werken met velden: artist, title, year_start, medium_raw, type_normalized, dimensions_raw, holder_name, holder_city, image_url).
          </p>
          <Textarea
            value={jsonData}
            onChange={(e) => setJsonData(e.target.value)}
            placeholder='[{"artist": "Monet", "title": "Water Lilies", ...}]'
            className="bg-slate-900 border-slate-700 font-mono text-sm"
            rows={10}
          />
          <Button onClick={handleImport} disabled={importing || !jsonData}>
            {importing ? 'Importeren...' : 'Importeer werken'}
          </Button>
        </TabsContent>

        <TabsContent value="manual" className="space-y-4 pt-4">
          <div className="space-y-3">
            <Input
              placeholder="Kunstenaarsnaam"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              className="bg-slate-900 border-slate-700"
            />
            <Input
              placeholder="Titel van het werk"
              value={artworkTitle}
              onChange={(e) => setArtworkTitle(e.target.value)}
              className="bg-slate-900 border-slate-700"
            />
            <Input
              placeholder="Jaar (optioneel)"
              type="number"
              value={artworkYear}
              onChange={(e) => setArtworkYear(e.target.value)}
              className="bg-slate-900 border-slate-700"
            />
            <Button onClick={handleAddArtwork} disabled={!artistName || !artworkTitle}>
              Werk toevoegen
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
