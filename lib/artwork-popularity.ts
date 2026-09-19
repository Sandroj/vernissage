export interface PopularityArtwork {
  title: string
  alternate_titles?: string | null
  catalogue_id?: string | null
  jh_catalogue_id?: string | null
}

type PopularityRule = {
  score: number
  matches: (artwork: PopularityArtwork) => boolean
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘]/g, "'")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')

const haystack = (artwork: PopularityArtwork) =>
  normalize([
    artwork.title,
    artwork.alternate_titles,
    artwork.catalogue_id,
    artwork.jh_catalogue_id,
  ].filter(Boolean).join(' '))

const titleIs = (...titles: string[]) => {
  const normalized = new Set(titles.map(normalize))
  return (artwork: PopularityArtwork) => normalized.has(normalize(artwork.title))
}

const textMatches = (pattern: RegExp) => (artwork: PopularityArtwork) => pattern.test(haystack(artwork))

const codeMatches = (...codes: string[]) => {
  const normalizedCodes = new Set(codes.map(normalize))
  return (artwork: PopularityArtwork) =>
    [artwork.catalogue_id, artwork.jh_catalogue_id].filter(Boolean).some((code) => normalizedCodes.has(normalize(code!)))
}

const anyOf = (...matchers: Array<(artwork: PopularityArtwork) => boolean>) => (artwork: PopularityArtwork) =>
  matchers.some((matches) => matches(artwork))

const RULES: Record<string, PopularityRule[]> = {
  'vincent-van-gogh': [
    { score: 1000, matches: codeMatches('F612', 'JH1731') },
    { score: 980, matches: anyOf(codeMatches('F454', 'F455', 'F456', 'F457', 'F458', 'F459'), textMatches(/\b(vase with|still life vase with|still life vase)\b.*\bsunflowers?\b/)) },
    { score: 960, matches: titleIs('Café Terrace at Night (Place du Forum, Arles)', 'The café terrace on the Place du Forum, Arles, at night') },
    { score: 940, matches: anyOf(codeMatches('F474', 'JH1592'), textMatches(/\bstarry night\b.*\brhone\b|\brhone bank\b.*\bstarry night\b/)) },
    { score: 920, matches: anyOf(codeMatches('F482', 'F483', 'F484'), textMatches(/\b(vincent'?s )?bedroom( in arles)?\b/)) },
    { score: 900, matches: anyOf(codeMatches('F608'), titleIs('Irises')) },
    { score: 880, matches: textMatches(/\balmond (blossom|tree in blossom)|\bbranches with almond blossom\b/) },
    { score: 860, matches: titleIs('The Potato Eaters', 'Potato eaters', 'The potato eaters') },
    { score: 840, matches: textMatches(/\bwheat ?field(?:s)? with cypresses\b/) },
    { score: 820, matches: textMatches(/\bwheatfield with crows\b/) },
    { score: 800, matches: textMatches(/\byellow house\b/) },
    { score: 780, matches: textMatches(/\bself portrait\b|\bself-portrait\b/) },
  ],
  'claude-monet': [
    { score: 1000, matches: titleIs('Impression, sunrise') },
    { score: 980, matches: titleIs('The Promenade, Woman with a Parasol', 'Woman with a Parasol - Madame Monet and Her Son') },
    { score: 960, matches: textMatches(/\bwater (lilies|lily pond)\b|\bnympheas\b|\bnympheas\b|\bnymphéas\b/) },
    { score: 940, matches: textMatches(/\brouen cathedral\b/) },
    { score: 920, matches: textMatches(/\b(grainstacks?|haystacks?|meules?)\b/) },
    { score: 900, matches: textMatches(/\bsaint lazare\b|\bgare saint lazare\b/) },
    { score: 880, matches: textMatches(/\bjapanese (foot)?bridge\b|\bpont japonais\b/) },
    { score: 860, matches: textMatches(/\bpoplars?\b|\bpeupliers?\b/) },
    { score: 840, matches: textMatches(/\bargenteuil\b/) },
    { score: 820, matches: textMatches(/\bcamille\b|\bla japonaise\b/) },
  ],
  'johannes-vermeer': [
    { score: 1000, matches: titleIs('Girl with a Pearl Earring') },
    { score: 980, matches: titleIs('The Milkmaid') },
    { score: 960, matches: titleIs('Girl Reading a Letter at an Open Window') },
    { score: 940, matches: titleIs('View of Delft') },
    { score: 920, matches: titleIs('The Art of Painting', 'The Allegory of Painting') },
    { score: 900, matches: titleIs('The Little Street') },
    { score: 880, matches: titleIs('The Astronomer') },
    { score: 860, matches: titleIs('The Geographer') },
    { score: 840, matches: titleIs('Woman Holding a Balance') },
    { score: 820, matches: titleIs('The Lacemaker') },
    { score: 800, matches: titleIs('The Concert') },
    { score: 780, matches: titleIs('Woman in Blue Reading a Letter') },
  ],
  'gustav-klimt': [
    { score: 1000, matches: titleIs('The Kiss') },
    { score: 980, matches: titleIs('Portrait of Adele Bloch-Bauer I') },
    { score: 960, matches: titleIs('Judith and the Head of Holofernes') },
    { score: 940, matches: titleIs('Portrait of Adele Bloch-Bauer II') },
    { score: 920, matches: titleIs('Death and Life') },
    { score: 900, matches: textMatches(/\bbeethoven frieze\b|\bhymn to joy\b/) },
    { score: 880, matches: textMatches(/\bmedicine\b/) },
    { score: 860, matches: titleIs('Hope II') },
    { score: 840, matches: textMatches(/\btree of life\b/) },
    { score: 820, matches: titleIs('Danae', 'Danaë') },
    { score: 800, matches: titleIs('Minerva or Pallas Athena') },
  ],
  'wassily-kandinsky': [
    { score: 1000, matches: titleIs('Color Study. Squares with Concentric Circles', 'Colour Study. Squares with Concentric Circles') },
    { score: 980, matches: titleIs('Composition VIII') },
    { score: 960, matches: titleIs('Composition VII') },
    { score: 940, matches: titleIs('Circles in a Circle') },
    { score: 920, matches: titleIs('Several Circles') },
    { score: 900, matches: titleIs('Yellow-Red-Blue', 'Yellow Red Blue') },
    { score: 880, matches: titleIs('On White II') },
    { score: 860, matches: titleIs('The Blue Rider') },
    { score: 840, matches: titleIs('Composition IV') },
    { score: 820, matches: titleIs('Composition VI') },
    { score: 800, matches: titleIs('Improvisation 28 (second version)') },
    { score: 780, matches: titleIs('Murnau Street With Women') },
  ],
  'frida-kahlo': [
    { score: 1000, matches: titleIs('The Two Fridas') },
    { score: 980, matches: titleIs('Self-Portrait with Thorn Necklace and Hummingbird') },
    { score: 960, matches: titleIs('The Broken Column') },
    { score: 940, matches: titleIs('Henry Ford Hospital') },
    { score: 920, matches: titleIs('The Wounded Deer') },
    { score: 900, matches: titleIs('What the Water Gave Me') },
    { score: 880, matches: titleIs('Without Hope') },
    { score: 860, matches: titleIs('My Birth') },
    { score: 840, matches: titleIs('Self-Portrait on the Border of Mexico and The United States') },
    { score: 820, matches: titleIs('Diego in My Thoughts (Thinking of Diego) (Self-Portrait as a Tehuana)') },
    { score: 800, matches: titleIs('Viva la Vida (Long Live Life)') },
  ],
}

export function artworkPopularityScore(artistSlug: string | undefined, artwork: PopularityArtwork) {
  if (!artistSlug) return 0
  return RULES[artistSlug]?.find((rule) => rule.matches(artwork))?.score ?? 0
}
