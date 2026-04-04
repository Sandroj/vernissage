'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'

const SCREENS = [
  [
    { slug: 'vangogh',      name: 'Van Gogh' },
    { slug: 'picasso',      name: 'Picasso' },
    { slug: 'davinci',      name: 'Da Vinci' },
    { slug: 'monet',        name: 'Monet' },
    { slug: 'rembrandt',    name: 'Rembrandt' },
    { slug: 'dali',         name: 'Dalí' },
    { slug: 'kahlo',        name: 'Frida Kahlo' },
    { slug: 'vermeer',      name: 'Vermeer' },
    { slug: 'michelangelo', name: 'Michelangelo' },
    { slug: 'matisse',      name: 'Matisse' },
    { slug: 'klimt',        name: 'Klimt' },
    { slug: 'munch',        name: 'Munch' },
  ],
  [
    { slug: 'raphael',    name: 'Raphael' },
    { slug: 'botticelli', name: 'Botticelli' },
    { slug: 'caravaggio', name: 'Caravaggio' },
    { slug: 'goya',       name: 'Goya' },
    { slug: 'renoir',     name: 'Renoir' },
    { slug: 'degas',      name: 'Degas' },
    { slug: 'cezanne',    name: 'Cézanne' },
    { slug: 'manet',      name: 'Manet' },
    { slug: 'gauguin',    name: 'Gauguin' },
    { slug: 'mondrian',   name: 'Mondrian' },
    { slug: 'chagall',    name: 'Chagall' },
    { slug: 'pollock',    name: 'Pollock' },
  ],
  [
    { slug: 'warhol',    name: 'Andy Warhol' },
    { slug: 'rothko',    name: 'Rothko' },
    { slug: 'basquiat',  name: 'Basquiat' },
    { slug: 'klee',      name: 'Klee' },
    { slug: 'miro',      name: 'Miró' },
    { slug: 'magritte',  name: 'Magritte' },
    { slug: 'okeeffe',   name: "O'Keeffe" },
    { slug: 'schiele',   name: 'Schiele' },
    { slug: 'bosch',     name: 'Bosch' },
    { slug: 'vaneyck',   name: 'Jan van Eyck' },
    { slug: 'kandinsky', name: 'Kandinsky' },
  ],
]

export default function DiscoverScreen({ initialVotes }: { initialVotes: string[] }) {
  const router = useRouter()
  const [screen, setScreen] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set(initialVotes))
  const [saving, setSaving] = useState(false)

  function toggle(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  async function handleFinish() {
    setSaving(true)
    await fetch('/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artistNames: Array.from(selected) }),
    })
    setSaving(false)
    router.push('/')
  }

  const artists = SCREENS[screen]
  const isLast = screen === SCREENS.length - 1

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Welke kunstenaars wil jij in de app?</h1>
        <p className="text-slate-400 text-sm">Klik op kunstenaars die je interessant vindt. We voegen de populairste als eerste toe.</p>
      </div>

      {/* Voortgang dots */}
      <div className="flex justify-center gap-2 mb-6">
        {SCREENS.map((_, i) => (
          <button
            key={i}
            onClick={() => setScreen(i)}
            className={`rounded-full transition-all ${i === screen ? 'w-7 h-2 bg-indigo-500' : 'w-2 h-2 bg-slate-700'}`}
          />
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-8">
        {artists.map(({ slug, name }) => {
          const isSelected = selected.has(slug)
          return (
            <button
              key={slug}
              onClick={() => toggle(slug)}
              className={`rounded-xl overflow-hidden border-2 transition-all ${isSelected ? 'border-indigo-500 shadow-lg shadow-indigo-900/30' : 'border-transparent'}`}
            >
              <div className="aspect-square bg-slate-800 relative">
                <img
                  src={`/images/discover/${slug}.jpg`}
                  alt={name}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
                    <div className="bg-indigo-500 rounded-full p-1">
                      <Check size={14} className="text-white" />
                    </div>
                  </div>
                )}
              </div>
              <div className={`py-2 px-1 text-center text-xs font-medium bg-slate-900 ${isSelected ? 'text-indigo-300' : 'text-slate-300'}`}>
                {name}
              </div>
            </button>
          )
        })}
      </div>

      {/* Navigatie */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          disabled={screen === 0}
          onClick={() => setScreen((s) => s - 1)}
          className="border-slate-700"
        >
          ← Vorige
        </Button>
        <span className="text-slate-400 text-sm">{selected.size} geselecteerd</span>
        {isLast ? (
          <Button onClick={handleFinish} disabled={saving}>
            {saving ? 'Opslaan...' : 'Opslaan ✓'}
          </Button>
        ) : (
          <Button onClick={() => setScreen((s) => s + 1)}>
            Volgende →
          </Button>
        )}
      </div>

      <p
        className="text-center text-slate-500 text-sm mt-4 cursor-pointer hover:text-slate-300"
        onClick={() => router.push('/')}
      >
        Sla over
      </p>
    </div>
  )
}
