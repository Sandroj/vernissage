/**
 * Enrich verified collection holders with map coordinates in dev.db and Turso.
 * Exact aliases are merged by moving their Artwork references; no Museum rows
 * are deleted and User/Seen/Report data is never touched.
 *
 * Coordinates were geocoded from official visitor addresses with OpenStreetMap
 * Nominatim on 2026-09-12.
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
