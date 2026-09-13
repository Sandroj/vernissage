/**
 * Enrich verified collection holders with map coordinates in dev.db and Turso.
 * Exact aliases are merged by moving their Artwork references; no Museum rows
 * are deleted and User/Seen/Report data is never touched.
 *
 * Coordinates were geocoded from official visitor addresses with OpenStreetMap
 * Nominatim on 2026-09-12 and 2026-09-13. The less searchable institutions
 * were cross-checked against their Wikidata place/country/coordinate claims.
 */
import { createClient } from '@libsql/client'
import { createRequire } from 'module'
import { copyFileSync, readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')

const LOCATIONS = [
  { name: 'Museum Ludwig', city: 'Cologne', country: 'Germany', lat: 50.9408347, lng: 6.9600217 },
  { name: 'Kunstmuseum Bern', aliases: ['Bern Kunstmuseum'], city: 'Bern', country: 'Switzerland', lat: 46.9512091, lng: 7.4430955 },
  { name: 'Staatsgalerie Stuttgart', city: 'Stuttgart', country: 'Germany', lat: 48.7802145, lng: 9.1871053 },
  { name: 'National Art Museum of Azerbaijan', city: 'Baku', country: 'Azerbaijan', lat: 40.3632725, lng: 49.8318442 },
  { name: 'National Gallery of Armenia', city: 'Yerevan', country: 'Armenia', lat: 40.17875, lng: 44.514167 },
  { name: 'San Francisco Museum of Modern Art', city: 'San Francisco', country: 'United States', lat: 37.785915, lng: -122.4007359 },
  { name: 'Portland Museum of Art', aliases: ['Maine, Portland Museum of Art'], city: 'Portland', country: 'United States', lat: 43.6537342, lng: -70.2620333 },
  { name: 'Astrakhan State Art Gallery', aliases: ['Astrakhan picture gallery of a name. B. M. Custodiev'], city: 'Astrakhan', country: 'Russia', lat: 46.349238, lng: 48.051837 },
  { name: 'Musée Zervos', city: 'Vézelay', country: 'France', lat: 47.4638, lng: 3.74329 },
  { name: 'Nelson-Atkins Museum of Art', aliases: ['Missouri, Nelson-Atkins Museum of Art'], city: 'Kansas City', country: 'United States', lat: 39.0449664, lng: -94.5809582 },
  { name: 'Musée d’arts de Nantes', aliases: ['Fine Arts Museum of Nantes'], city: 'Nantes', country: 'France', lat: 47.2195186, lng: -1.5475746 },
  { name: 'Nizhny Novgorod State Art Museum', city: 'Nizhny Novgorod', country: 'Russia', lat: 56.3295482, lng: 44.0064045 },
  { name: 'Georgian National Museum', city: 'Tbilisi', country: 'Georgia', lat: 41.6960428, lng: 44.8002209 },
  { name: 'LWL-Museum of Art and Culture', city: 'Münster', country: 'Germany', lat: 51.9613817, lng: 7.6242696 },
  { name: 'Vyatka Art Museum', city: 'Kirov', country: 'Russia', lat: 58.60223, lng: 49.66965 },
  { name: 'Gemeente Zundert', city: 'Zundert', country: 'Netherlands', lat: 51.4730419, lng: 4.6642726 },
  { name: 'Museum de Fundatie', aliases: ['Hannema-de Stuers Fundatie'], city: 'Zwolle', country: 'Netherlands', lat: 52.5102388, lng: 6.0915022 },
  { name: 'National Galleries Scotland', aliases: ['National Gallery of Scotland'], city: 'Edinburgh', country: 'United Kingdom', lat: 55.950885, lng: -3.1956117 },
  { name: 'Musée Angladon – Collection Jacques Doucet', city: 'Avignon', country: 'France', lat: 43.9460946, lng: 4.8069976 },
  { name: 'Drents Museum', city: 'Assen', country: 'Netherlands', lat: 52.9928958, lng: 6.5642603 },
  { name: 'Barber Institute of Fine Arts', city: 'Birmingham', country: 'United Kingdom', lat: 52.450331, lng: -1.927827 },
  { name: 'Royal Museum of Fine Arts Antwerp', aliases: ['Koninklijk Museum voor Schone Kunsten Antwerpen'], city: 'Antwerp', country: 'Belgium', lat: 51.2085932, lng: 4.3946308 },
  { name: 'Morohashi Museum of Modern Art', city: 'Kitashiobara', country: 'Japan', lat: 37.6538545, lng: 140.0965274 },
  { name: 'Museum Langmatt', city: 'Baden', country: 'Switzerland', lat: 47.4814711, lng: 8.3075619 },
  { name: 'Beaux-Arts Mons (BAM)', city: 'Mons', country: 'Belgium', lat: 50.4557663, lng: 3.9523165 },
  { name: 'Staatliche Kunsthalle Karlsruhe', city: 'Karlsruhe', country: 'Germany', lat: 49.0119303, lng: 8.3997157 },
  { name: 'Rijksmuseum Twenthe', city: 'Enschede', country: 'Netherlands', lat: 52.2280508, lng: 6.8972136 },
  { name: 'Museum of Fine Arts Budapest', aliases: ['Szépmüvészeti Múzeum'], city: 'Budapest', country: 'Hungary', lat: 47.5162182, lng: 19.0763649 },
  { name: 'Hamburger Kunsthalle', aliases: ['Kunsthalle Hamburg'], city: 'Hamburg', country: 'Germany', lat: 53.5552936, lng: 10.0030011 },
  { name: 'Van Gogh Museum', city: 'Amsterdam', country: 'Netherlands', lat: 52.3583673, lng: 4.88109 },
  { name: 'Kröller-Müller Museum', city: 'Otterlo', country: 'Netherlands', lat: 52.0959135, lng: 5.8178298 },
  { name: 'Kunsthaus Zürich', city: 'Zürich', country: 'Switzerland', lat: 47.3702241, lng: 8.5479797 },
  { name: "Musée d'Orsay", city: 'Paris', country: 'France', lat: 48.8599179, lng: 2.3265849 },
  { name: 'Barnes Foundation', city: 'Philadelphia', country: 'United States', lat: 39.9605495, lng: -75.1726581 },
  { name: 'National Museum', city: 'Oslo', country: 'Norway', lat: 59.9116278, lng: 10.728425 },
  { name: 'Norton Simon Museum', aliases: ['California, Norton Simon Museum'], city: 'Pasadena', country: 'United States', lat: 34.1463727, lng: -118.159259 },
  { name: 'Solomon R. Guggenheim Museum', aliases: ['The Solomon R. Guggenheim Museum'], city: 'New York', country: 'United States', lat: 40.7829932, lng: -73.958925 },
  { name: 'Toledo Museum of Art', city: 'Toledo', country: 'United States', lat: 41.658457, lng: -83.5595316 },
  { name: 'Art Institute of Chicago', city: 'Chicago', country: 'United States', lat: 41.879605, lng: -87.6230716 },
  { name: 'Ateneum Art Museum', city: 'Helsinki', country: 'Finland', lat: 60.1700175, lng: 24.9440678 },
  { name: 'Buffalo AKG Art Museum', city: 'Buffalo', country: 'United States', lat: 42.9323213, lng: -78.87576 },
  { name: 'Centraal Museum', city: 'Utrecht', country: 'Netherlands', lat: 52.0836118, lng: 5.1256638 },
  { name: 'Fondation Pierre Gianadda', city: 'Martigny', country: 'Switzerland', lat: 46.0947433, lng: 7.0707001 },
  { name: 'Groninger Museum', city: 'Groningen', country: 'Netherlands', lat: 53.2122819, lng: 6.566029 },
  { name: 'Indianapolis Museum of Art', city: 'Indianapolis', country: 'United States', lat: 39.8259877, lng: -86.18581 },
  { name: 'Kunst Museum Winterthur', city: 'Winterthur', country: 'Switzerland', lat: 47.5016153, lng: 8.7303915 },
  { name: 'Kunstmuseum Basel', city: 'Basel', country: 'Switzerland', lat: 47.5539294, lng: 7.5944513 },
  { name: 'Kunstmuseum Den Haag', city: 'The Hague', country: 'Netherlands', lat: 52.0897241, lng: 4.2807291 },
  { name: 'Museum Boijmans Van Beuningen', aliases: ['Museum Boijmans van Beuningen'], city: 'Rotterdam', country: 'Netherlands', lat: 51.9143648, lng: 4.4730006 },
  { name: 'Musée des Beaux Arts de Lyon', city: 'Lyon', country: 'France', lat: 45.7667047, lng: 4.8336451 },
  { name: 'National Gallery Prague', city: 'Prague', country: 'Czechia', lat: 50.0902855, lng: 14.3966952 },
  { name: 'Pommersches Landesmuseum', city: 'Greifswald', country: 'Germany', lat: 54.0949629, lng: 13.3826818 },
  { name: 'Rijksmuseum', city: 'Amsterdam', country: 'Netherlands', lat: 52.3598431, lng: 4.8850395 },
  { name: 'Staatliche Graphische Sammlung München', city: 'Munich', country: 'Germany', lat: 48.1445389, lng: 11.5663772 },
  { name: 'Stedelijk Museum Amsterdam', city: 'Amsterdam', country: 'Netherlands', lat: 52.3579003, lng: 4.8798598 },
  { name: 'Von der Heydt-Museum', aliases: ['Von der Heydt Museum'], city: 'Wuppertal', country: 'Germany', lat: 51.2574373, lng: 7.1466389 },
  { name: 'Österreichische Galerie Belvedere', city: 'Vienna', country: 'Austria', lat: 48.1915415, lng: 16.3808882 },
  { name: 'Museum Folkwang', city: 'Essen', country: 'Germany', lat: 51.4584, lng: 7.0113 },
]

function loadEnv() {
  return Object.fromEntries(
    readFileSync(resolve(__dirname, '../.env.local'), 'utf8')
      .split('\n')
      .filter((line) => line.includes('='))
      .map((line) => {
        const index = line.indexOf('=')
        let value = line.slice(index + 1).trim()
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
        return [line.slice(0, index), value]
      }),
  )
}

function normalizeName(name) {
  return name.normalize('NFKC').toLocaleLowerCase('en-US')
}

function namesFor(location) {
  return new Set([location.name, ...(location.aliases ?? [])].map(normalizeName))
}

function syncLocal() {
  const dbPath = resolve(__dirname, '../dev.db')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  copyFileSync(dbPath, `${dbPath}.bak-${stamp}-before-museum-locations`)
  const db = new Database(dbPath)
  const allMuseums = db.prepare('SELECT id, name FROM Museum ORDER BY id').all()
  let museums = 0
  let moved = 0

  const transaction = db.transaction(() => {
    for (const location of LOCATIONS) {
      const names = namesFor(location)
      const matches = allMuseums.filter((museum) => names.has(normalizeName(museum.name)))
      if (!matches.length) continue
      const target = matches.find((museum) => museum.name === location.name) ?? matches[0]
      for (const duplicate of matches.filter((museum) => museum.id !== target.id)) {
        moved += db.prepare('UPDATE Artwork SET museumId=? WHERE museumId=?').run(target.id, duplicate.id).changes
      }
      db.prepare('UPDATE Museum SET name=?, city=?, country=?, lat=?, lng=? WHERE id=?')
        .run(location.name, location.city, location.country, location.lat, location.lng, target.id)
      museums++
    }
  })
  transaction()
  db.close()
  return { museums, moved }
}

async function syncTurso() {
  const env = loadEnv()
  if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) throw new Error('Turso credentials missing from .env.local')
  const db = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN })
  const museumResult = await db.execute('SELECT id, name FROM Museum ORDER BY id')
  const allMuseums = museumResult.rows.map((row) => ({ id: Number(row.id), name: String(row.name) }))
  let museums = 0
  let moved = 0

  for (const location of LOCATIONS) {
    const names = namesFor(location)
    const matches = allMuseums.filter((museum) => names.has(normalizeName(museum.name)))
    if (!matches.length) continue
    const target = matches.find((museum) => museum.name === location.name) ?? matches[0]
    for (const duplicate of matches.filter((museum) => museum.id !== target.id)) {
      const update = await db.execute({ sql: 'UPDATE Artwork SET museumId=? WHERE museumId=?', args: [target.id, duplicate.id] })
      moved += update.rowsAffected
    }
    await db.execute({
      sql: 'UPDATE Museum SET name=?, city=?, country=?, lat=?, lng=? WHERE id=?',
      args: [location.name, location.city, location.country, location.lat, location.lng, target.id],
    })
    museums++
  }
  db.close()
  return { museums, moved }
}

const local = syncLocal()
console.log(`dev.db: ${local.museums} musea verrijkt, ${local.moved} werken naar canonieke museumrij verplaatst`)
const turso = await syncTurso()
console.log(`Turso: ${turso.museums} musea verrijkt, ${turso.moved} werken naar canonieke museumrij verplaatst`)
