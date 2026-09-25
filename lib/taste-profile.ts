type Row = {
  dateSeen: Date | string
  artwork: { year_start: number | null; artist: { name: string }; museum: { name: string } | null }
}
export type Bar = { label: string; count: number }

/** Smaakprofiel uit iemands gezien-werken: top-kunstenaars/-musea, decennia, per jaar. */
export function tasteProfile(rows: Row[]) {
  return {
    artists: top(rows.map((r) => r.artwork.artist.name), 5),
    museums: top(rows.flatMap((r) => (r.artwork.museum ? [r.artwork.museum.name] : [])), 5),
    decades: sorted(rows.flatMap((r) => (r.artwork.year_start ? [decade(r.artwork.year_start)] : []))),
    years: sorted(rows.map((r) => String(new Date(r.dateSeen).getFullYear()))),
  }
}

function tally(labels: string[]) {
  const m = new Map<string, number>()
  for (const l of labels) m.set(l, (m.get(l) ?? 0) + 1)
  return Array.from(m, ([label, count]) => ({ label, count }))
}
const top = (labels: string[], n: number): Bar[] =>
  tally(labels).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, n)
const sorted = (labels: string[]): Bar[] => tally(labels).sort((a, b) => a.label.localeCompare(b.label))

// "1870–79": taalneutraal (geen "1870s"/"jaren 1870").
function decade(year: number) {
  const d = Math.floor(year / 10) * 10
  return `${d}–${String((d + 9) % 100).padStart(2, '0')}`
}
