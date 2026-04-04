import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import BetterSqlite3 from 'better-sqlite3'
import * as fs from 'fs'
import * as path from 'path'

const DB_PATH = path.resolve(__dirname, '../dev.db')
const adapter = new PrismaBetterSqlite3({ url: DB_PATH })
const prisma = new PrismaClient({ adapter })

const SQLITE_SOURCE = path.resolve(
  __dirname,
  '../../sources/kandinsky_scraper_bundle/kandinsky_full/data/kandinsky_works.sqlite'
)
const IMAGES_SOURCE = path.resolve(
  __dirname,
  '../../sources/kandinsky_scraper_bundle/kandinsky_full/images'
)
const IMAGES_DEST = path.resolve(__dirname, '../public/images/artworks')

async function main() {
  console.log('Seeding ArtTracker database...')

  // 1. Zorg dat images-map bestaat
  fs.mkdirSync(IMAGES_DEST, { recursive: true })

  // 2. Lees Kandinsky data uit source SQLite
  if (!fs.existsSync(SQLITE_SOURCE)) {
    throw new Error(`Source database not found: ${SQLITE_SOURCE}`)
  }
  const sourceDb = new BetterSqlite3(SQLITE_SOURCE, { readonly: true })
  const rows = sourceDb.prepare('SELECT * FROM works').all() as any[]
  sourceDb.close()

  console.log(`Found ${rows.length} Kandinsky works`)

  // 3. Maak kunstenaar aan
  const artist = await prisma.artist.upsert({
    where: { slug: 'wassily-kandinsky' },
    update: {},
    create: {
      name: 'Wassily Kandinsky',
      slug: 'wassily-kandinsky',
      birth_year: 1866,
      death_year: 1944,
      nationality: 'Russisch',
      bio: 'Wassily Kandinsky (1866–1944) was een Russisch-Franse schilder en kunsttheoreticus, beschouwd als pionier van de abstracte kunst. Hij doceerde aan het Bauhaus en ontwikkelde een diepgaande theorie over kleur en vorm.',
    },
  })

  console.log(`Artist: ${artist.name} (id: ${artist.id})`)

  // 4. Verwerk musea via findOrCreate pattern
  const museumCache = new Map<string, number>()

  async function getOrCreateMuseum(name: string, city: string): Promise<number> {
    const key = `${name}||${city}`
    if (museumCache.has(key)) return museumCache.get(key)!
    let museum = await prisma.museum.findFirst({ where: { name, city } })
    if (!museum) {
      museum = await prisma.museum.create({
        data: { name, city, country: inferCountry(city) },
      })
    }
    museumCache.set(key, museum.id)
    return museum.id
  }

  // 5. Verwerk werken
  let created = 0
  let skipped = 0

  for (const row of rows) {
    // Kopieer afbeelding
    const srcImg = path.join(IMAGES_SOURCE, `work-${row.work_id}.jpg`)
    const destImg = path.join(IMAGES_DEST, `work-${row.work_id}.jpg`)
    if (fs.existsSync(srcImg) && !fs.existsSync(destImg)) {
      fs.copyFileSync(srcImg, destImg)
    }

    // Museum
    let museumId: number | undefined
    if (row.holder_name && row.holder_city) {
      museumId = await getOrCreateMuseum(row.holder_name, row.holder_city)
    }

    // Werk
    const existing = await prisma.artwork.findFirst({
      where: { image_local_path: `/images/artworks/work-${row.work_id}.jpg` },
    })

    if (existing) {
      skipped++
      continue
    }

    await prisma.artwork.create({
      data: {
        artistId: artist.id,
        museumId,
        title: row.title,
        year_start: row.year_start,
        year_end: row.year_end,
        medium_raw: row.medium_raw,
        type_normalized: row.type_normalized,
        dimensions_raw: row.dimensions_raw,
        image_url: row.image_url,
        image_local_path: `/images/artworks/work-${row.work_id}.jpg`,
        source_url: row.source_url,
      },
    })
    created++
  }

  console.log(`Artworks: ${created} aangemaakt, ${skipped} overgeslagen`)
  console.log('Seed voltooid.')
}

function inferCountry(city: string): string {
  const map: Record<string, string> = {
    Munich: 'Duitsland', Berlin: 'Duitsland', Hamburg: 'Duitsland',
    Paris: 'Frankrijk', Lyon: 'Frankrijk',
    Amsterdam: 'Nederland', Rotterdam: 'Nederland', 'The Hague': 'Nederland',
    Moscow: 'Rusland', 'Saint Petersburg': 'Rusland',
    'New York': 'Verenigde Staten', Chicago: 'Verenigde Staten', Washington: 'Verenigde Staten',
    London: 'Verenigd Koninkrijk',
    Vienna: 'Oostenrijk',
    Zurich: 'Zwitserland', Basel: 'Zwitserland',
    Milan: 'Italië', Rome: 'Italië',
    Madrid: 'Spanje', Barcelona: 'Spanje',
    Stockholm: 'Zweden',
    Oslo: 'Noorwegen',
    Copenhagen: 'Denemarken',
  }
  const result = map[city]
  if (!result) console.warn(`  ! Onbekend land voor stad: ${city}`)
  return result ?? 'Onbekend'
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
