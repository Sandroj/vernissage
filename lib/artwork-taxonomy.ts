export interface TaxonomyArtwork {
  title: string
  alternate_titles?: string | null
  year_start?: number | null
  year_end?: number | null
}

export interface TaxonomyOption {
  key: string
  labelKey: string
  matches: (artwork: TaxonomyArtwork) => boolean
}

export interface ArtistTaxonomy {
  periods: TaxonomyOption[]
  themes: TaxonomyOption[]
}

const yearIn = (from: number, to: number) => (artwork: TaxonomyArtwork) => {
  const year = artwork.year_start ?? artwork.year_end
  return year != null && year >= from && year <= to
}

const titleMatches = (pattern: RegExp) => (artwork: TaxonomyArtwork) =>
  pattern.test(`${artwork.title} ${artwork.alternate_titles ?? ''}`)

// Curatorial facets are intentionally conservative. Periods follow the
// chronology used by the artist's principal museum; themes only match titles
// that explicitly identify a documented series or subject.
export const ARTIST_TAXONOMIES: Record<string, ArtistTaxonomy> = {
  'vincent-van-gogh': {
    periods: [
      { key: 'early-netherlands', labelKey: 'period.vanGoghEarlyNetherlands', matches: yearIn(1881, 1883) },
      { key: 'nuenen', labelKey: 'period.vanGoghNuenen', matches: yearIn(1884, 1885) },
      { key: 'paris', labelKey: 'period.vanGoghParis', matches: yearIn(1886, 1887) },
      { key: 'arles', labelKey: 'period.vanGoghArles', matches: yearIn(1888, 1888) },
      { key: 'saint-remy', labelKey: 'period.vanGoghSaintRemy', matches: yearIn(1889, 1889) },
      { key: 'auvers', labelKey: 'period.vanGoghAuvers', matches: yearIn(1890, 1890) },
    ],
    themes: [
      { key: 'sunflowers', labelKey: 'theme.sunflowers', matches: titleMatches(/\bsunflowers?\b/i) },
      { key: 'self-portraits', labelKey: 'theme.selfPortraits', matches: titleMatches(/self[- ]portrait|portrait of (?:the )?artist/i) },
      { key: 'orchards', labelKey: 'theme.orchards', matches: titleMatches(/\borchards?\b|blossoming (?:fruit )?trees?/i) },
      { key: 'wheatfields', labelKey: 'theme.wheatfields', matches: titleMatches(/\bwheat(?:fields?| fields?)\b/i) },
      { key: 'cypresses', labelKey: 'theme.cypresses', matches: titleMatches(/\bcypresses?\b/i) },
      { key: 'bedroom', labelKey: 'theme.bedroom', matches: titleMatches(/\bbedroom\b/i) },
    ],
  },
  'wassily-kandinsky': {
    periods: [
      { key: 'early-munich', labelKey: 'period.kandinskyEarlyMunich', matches: yearIn(1896, 1907) },
      { key: 'murnau-blue-rider', labelKey: 'period.kandinskyMurnau', matches: yearIn(1908, 1914) },
      { key: 'russia', labelKey: 'period.kandinskyRussia', matches: yearIn(1915, 1921) },
      { key: 'bauhaus', labelKey: 'period.kandinskyBauhaus', matches: yearIn(1922, 1933) },
      { key: 'paris', labelKey: 'period.kandinskyParis', matches: yearIn(1934, 1944) },
    ],
    themes: [
      { key: 'impressions', labelKey: 'theme.impressions', matches: titleMatches(/\bimpression(?:s|\s+[ivxlcdm\d]+)?\b/i) },
      { key: 'improvisations', labelKey: 'theme.improvisations', matches: titleMatches(/\bimprovisation(?:s|\s+[ivxlcdm\d]+)?\b/i) },
      { key: 'compositions', labelKey: 'theme.compositions', matches: titleMatches(/\bcomposition(?:s|\s+[ivxlcdm\d]+)?\b/i) },
      { key: 'murnau', labelKey: 'theme.murnau', matches: titleMatches(/\bmurnau\b/i) },
      { key: 'small-worlds', labelKey: 'theme.smallWorlds', matches: titleMatches(/\bsmall worlds?\b/i) },
    ],
  },
  'johannes-vermeer': {
    periods: [
      { key: 'early-history', labelKey: 'period.vermeerEarly', matches: yearIn(1653, 1656) },
      { key: 'emerging-genre', labelKey: 'period.vermeerEmerging', matches: yearIn(1657, 1661) },
      { key: 'mature-interiors', labelKey: 'period.vermeerMature', matches: yearIn(1662, 1667) },
      { key: 'late', labelKey: 'period.vermeerLate', matches: yearIn(1668, 1675) },
    ],
    themes: [
      { key: 'history-faith', labelKey: 'theme.historyFaith', matches: titleMatches(/diana|saint praxedis|martha and mary|allegory|faith/i) },
      { key: 'delft', labelKey: 'theme.delft', matches: titleMatches(/view of delft|little street/i) },
      { key: 'letters', labelKey: 'theme.letters', matches: titleMatches(/\bletter\b/i) },
      { key: 'music', labelKey: 'theme.music', matches: titleMatches(/concert|music|lute|guitar|virginal/i) },
      { key: 'tronies', labelKey: 'theme.tronies', matches: titleMatches(/pearl earring|red hat|girl with a flute|study of a young woman|portrait of a young woman/i) },
      { key: 'scholars', labelKey: 'theme.scholars', matches: titleMatches(/astronomer|geographer/i) },
    ],
  },
  'claude-monet': {
    periods: [
      { key: 'monet-early', labelKey: 'period.monetEarly', matches: yearIn(1858, 1869) },
      { key: 'monet-argenteuil', labelKey: 'period.monetArgenteuil', matches: yearIn(1870, 1878) },
      { key: 'monet-vetheuil', labelKey: 'period.monetVetheuil', matches: yearIn(1879, 1885) },
      { key: 'monet-giverny', labelKey: 'period.monetGiverny', matches: yearIn(1886, 1899) },
      { key: 'monet-late', labelKey: 'period.monetLate', matches: yearIn(1900, 1926) },
    ],
    themes: [
      { key: 'monet-water-lilies', labelKey: 'theme.monetWaterLilies', matches: titleMatches(/water lilies|nymph[eé]as|nénuphars/i) },
      { key: 'monet-rouen', labelKey: 'theme.monetRouen', matches: titleMatches(/rouen cathedral/i) },
      { key: 'monet-haystacks', labelKey: 'theme.monetHaystacks', matches: titleMatches(/haystacks?|meules/i) },
      { key: 'monet-parliament', labelKey: 'theme.monetParliament', matches: titleMatches(/houses? of parliament|parlement/i) },
      { key: 'monet-giverny', labelKey: 'theme.monetGiverny', matches: titleMatches(/giverny|japanese bridge|pont japonais/i) },
    ],
  },
  'gustav-klimt': {
    periods: [
      { key: 'klimt-historicism', labelKey: 'period.klimtHistoricism', matches: yearIn(1876, 1892) },
      { key: 'klimt-secession', labelKey: 'period.klimtSecession', matches: yearIn(1893, 1904) },
      { key: 'klimt-golden-period', labelKey: 'period.klimtGolden', matches: yearIn(1905, 1909) },
      { key: 'klimt-late', labelKey: 'period.klimtLate', matches: yearIn(1910, 1918) },
    ],
    themes: [
      { key: 'klimt-portraits', labelKey: 'theme.klimtPortraits', matches: titleMatches(/portrait|bildnis/i) },
      { key: 'klimt-landscapes', labelKey: 'theme.klimtLandscapes', matches: titleMatches(/landscape|lake|garden|forest|field|attersee|kammer/i) },
      { key: 'klimt-allegory', labelKey: 'theme.klimtAllegory', matches: titleMatches(/judith|pallas|medicine|philosophy|jurisprudence|beethoven|frieze|allegory/i) },
      { key: 'klimt-nudes', labelKey: 'theme.klimtNudes', matches: titleMatches(/nude|nymph|water serpent|love|adam and eve/i) },
    ],
  },
  'frida-kahlo': {
    periods: [
      { key: 'kahlo-early', labelKey: 'period.kahloEarly', matches: yearIn(1924, 1929) },
      { key: 'kahlo-united-states', labelKey: 'period.kahloUnitedStates', matches: yearIn(1930, 1933) },
      { key: 'kahlo-return-mexico', labelKey: 'period.kahloReturnMexico', matches: yearIn(1934, 1940) },
      { key: 'kahlo-international', labelKey: 'period.kahloInternational', matches: yearIn(1941, 1949) },
      { key: 'kahlo-late', labelKey: 'period.kahloLate', matches: yearIn(1950, 1954) },
    ],
    themes: [
      { key: 'kahlo-self-portraits', labelKey: 'theme.selfPortraits', matches: titleMatches(/self[- ]portrait|autorretrato/i) },
      { key: 'kahlo-still-lifes', labelKey: 'theme.kahloStillLifes', matches: titleMatches(/still life|naturaleza muerta|\bfruits?\b|\bfrutas?\b|coconuts?|watermelons?|sandías?/i) },
      { key: 'kahlo-diego', labelKey: 'theme.kahloDiego', matches: titleMatches(/\bdiego\b/i) },
      { key: 'kahlo-body', labelKey: 'theme.kahloBody', matches: titleMatches(/hospital|broken column|columna rota|\bbirth\b|nacimiento|wounded|herid[ao]|tree of hope|árbol de la esperanza|without hope|sin esperanza/i) },
      { key: 'kahlo-portraits', labelKey: 'theme.kahloPortraits', matches: titleMatches(/\bportrait of\b|\bretrato de\b/i) },
    ],
  },
  'rembrandt': {
    periods: [
      { key: 'rembrandt-leiden', labelKey: 'period.rembrandtLeiden', matches: yearIn(1620, 1631) },
      { key: 'rembrandt-early-amsterdam', labelKey: 'period.rembrandtEarlyAmsterdam', matches: yearIn(1632, 1634) },
      { key: 'rembrandt-peak', labelKey: 'period.rembrandtPeak', matches: yearIn(1635, 1642) },
      { key: 'rembrandt-deepening', labelKey: 'period.rembrandtDeepening', matches: yearIn(1643, 1656) },
      { key: 'rembrandt-late', labelKey: 'period.rembrandtLate', matches: yearIn(1657, 1669) },
    ],
    themes: [
      { key: 'rembrandt-self-portraits', labelKey: 'theme.selfPortraits', matches: titleMatches(/self[- ]?portrait/i) },
      { key: 'rembrandt-biblical', labelKey: 'theme.rembrandtBiblical', matches: titleMatches(/prodigal|susanna|bathsheba|jacob|joseph|abraham|\bdavid\b|christ|apostle|tobit|samson|belshazzar|potiphar/i) },
      { key: 'rembrandt-group-portraits', labelKey: 'theme.rembrandtGroupPortraits', matches: titleMatches(/night watch|anatomy lesson|syndics|company of/i) },
      { key: 'rembrandt-portraits', labelKey: 'theme.rembrandtPortraits', matches: titleMatches(/\bportrait of\b/i) },
      { key: 'rembrandt-landscapes', labelKey: 'theme.rembrandtLandscapes', matches: titleMatches(/landscape/i) },
    ],
  },
}
