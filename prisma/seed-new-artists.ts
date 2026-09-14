/**
 * Seed script voor Van Gogh, Monet en Klimt
 * Leest data uit de scraped JSON-bestanden in ~/claude-code/projects/art/sources/
 *
 * Run: ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-new-artists.ts
 */

import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import BetterSqlite3 from 'better-sqlite3'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { normalizeArtworkTitle } from '../lib/artwork-title'

const DB_PATH = path.resolve(__dirname, '../dev.db')
const adapter = new PrismaBetterSqlite3({ url: DB_PATH })
const prisma = new PrismaClient({ adapter })

const IMAGES_DEST = path.resolve(__dirname, '../public/images/artworks')

interface WorkRecord {
  work_id: number
  artist: string
  title: string | null
  year_raw: string | null
  year_start: number | null
  year_end: number | null
  medium_raw: string | null
  type_normalized: string | null
  dimensions_raw: string | null
  holder_raw: string | null
  holder_city: string | null
  holder_name: string | null
  holder_type: string | null
  image_url: string | null
  image_local_path: string | null
  source_url: string | null
}

interface ArtistSeedConfig {
  key: string
  sourceDir: string
  prefix: string
  artist: {
    name: string
    slug: string
    birth_year: number
    death_year: number
    nationality: string
    bio: string
    portrait_url: string
  }
}

const ARTISTS: ArtistSeedConfig[] = [
  {
    key: 'vangogh',
    sourceDir: path.join(os.homedir(), 'claude-code/projects/art/sources/vangogh'),
    prefix: 'vangogh',
    artist: {
      name: 'Vincent van Gogh',
      slug: 'vincent-van-gogh',
      birth_year: 1853,
      death_year: 1890,
      nationality: 'Dutch',
      bio: 'Vincent Willem van Gogh (1853–1890) was een Nederlandse post-impressionistische schilder die behoort tot de beroemdste en meest invloedrijke figuren in de westerse kunstgeschiedenis. In iets meer dan een decennium schiep hij zo\'n 2.100 kunstwerken, waaronder ongeveer 860 olieverfschilderijen. Zijn werk staat bekend om zijn expressieve penseelvoering, gedurfde kleuren en emotionele eerlijkheid.',
      portrait_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Vincent_van_Gogh_-_Self-Portrait_-_Google_Art_Project_%28454045%29.jpg/400px-Vincent_van_Gogh_-_Self-Portrait_-_Google_Art_Project_%28454045%29.jpg',
    },
  },
  {
    key: 'monet',
    sourceDir: path.join(os.homedir(), 'claude-code/projects/art/sources/monet'),
    prefix: 'monet',
    artist: {
      name: 'Claude Monet',
      slug: 'claude-monet',
      birth_year: 1840,
      death_year: 1926,
      nationality: 'French',
      bio: 'Oscar-Claude Monet (1840–1926) was een Franse impressionistische schilder en mede-oprichter van de impressionistische stroming. Hij staat bekend om zijn plein-air-schilderijen en zijn series over de waterlelies, hooibergen en de kathedraal van Rouen.',
      portrait_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Claude_Monet_1899_Nadar_crop.jpg/400px-Claude_Monet_1899_Nadar_crop.jpg',
    },
  },
  {
    key: 'klimt',
    sourceDir: path.join(os.homedir(), 'claude-code/projects/art/sources/klimt'),
    prefix: 'klimt',
    artist: {
      name: 'Gustav Klimt',
      slug: 'gustav-klimt',
      birth_year: 1862,
      death_year: 1918,
      nationality: 'Austrian',
      bio: 'Gustav Klimt (1862–1918) was een Oostenrijkse symbolistische schilder en een van de meest prominente leden van de Weense Sezession. Hij is beroemd om zijn goudkleurige schilderijen, met name De Kus en Portret van Adele Bloch-Bauer I.',
      portrait_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Klimt_photo_by_Moritz_N%C3%A4hr_01.jpg/400px-Klimt_photo_by_Moritz_N%C3%A4hr_01.jpg',
    },
  },
]

function inferCountry(city: string): string {
  const map: Record<string, string> = {
    Amsterdam: 'Nederland', Rotterdam: 'Nederland', 'The Hague': 'Nederland', Otterlo: 'Nederland',
    Paris: 'Frankrijk', Lyon: 'Frankrijk', Giverny: 'Frankrijk',
    Munich: 'Duitsland', Berlin: 'Duitsland', Hamburg: 'Duitsland', Essen: 'Duitsland', Cologne: 'Duitsland',
    'New York': 'Verenigde Staten', Chicago: 'Verenigde Staten', Washington: 'Verenigde Staten',
    'Los Angeles': 'Verenigde Staten', Boston: 'Verenigde Staten', Philadelphia: 'Verenigde Staten',
    Baltimore: 'Verenigde Staten', Minneapolis: 'Verenigde Staten', Detroit: 'Verenigde Staten',
    Hartford: 'Verenigde Staten', Dallas: 'Verenigde Staten', Houston: 'Verenigde Staten',
    Denver: 'Verenigde Staten', 'San Francisco': 'Verenigde Staten', Pasadena: 'Verenigde Staten',
    Indianapolis: 'Verenigde Staten', Cleveland: 'Verenigde Staten', Cincinnati: 'Verenigde Staten',
    'New Haven': 'Verenigde Staten', Williamstown: 'Verenigde Staten', Brooklyn: 'Verenigde Staten',
    London: 'Verenigd Koninkrijk', Edinburgh: 'Verenigd Koninkrijk',
    Vienna: 'Oostenrijk',
    Zurich: 'Zwitserland', Basel: 'Zwitserland',
    Moscow: 'Rusland', 'Saint Petersburg': 'Rusland', 'St. Petersburg': 'Rusland',
    Tokyo: 'Japan', Osaka: 'Japan',
    Milan: 'Italië', Rome: 'Italië', Venice: 'Italië',
    Madrid: 'Spanje', Barcelona: 'Spanje',
    Brussels: 'België',
    Stockholm: 'Zweden',
    Oslo: 'Noorwegen',
    Copenhagen: 'Denemarken',
    Prague: 'Tsjechië',
    Budapest: 'Hongarije',
    'São Paulo': 'Brazilië',
    Melbourne: 'Australië', Sydney: 'Australië',
    Toronto: 'Canada', Ottawa: 'Canada',
    'Buenos Aires': 'Argentinië',
  }
  return map[city] ?? 'Onbekend'
}

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

async function seedArtist(config: ArtistSeedConfig) {
  const { sourceDir, prefix, artist } = config

  console.log(`\n${'='.repeat(50)}`)
  console.log(`Seeding: ${artist.name}`)
  console.log('='.repeat(50))

  // Load JSON data
  const jsonPath = path.join(sourceDir, 'data', `${prefix}_works.json`)
  if (!fs.existsSync(jsonPath)) {
    console.error(`  Source data not found: ${jsonPath}`)
    return
  }

  const works: WorkRecord[] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
  console.log(`  Loaded ${works.length} works from JSON`)

  // Source images dir
  const imagesSource = path.join(sourceDir, 'images')

  // Create/update artist
  const artistRecord = await prisma.artist.upsert({
    where: { slug: artist.slug },
    update: {
      name: artist.name,
      birth_year: artist.birth_year,
      death_year: artist.death_year,
      nationality: artist.nationality,
      bio: artist.bio,
      portrait_url: artist.portrait_url,
    },
    create: {
      name: artist.name,
      slug: artist.slug,
      birth_year: artist.birth_year,
      death_year: artist.death_year,
      nationality: artist.nationality,
      bio: artist.bio,
      portrait_url: artist.portrait_url,
    },
  })
  console.log(`  Artist: ${artistRecord.name} (id: ${artistRecord.id})`)

  // Ensure images dest exists
  fs.mkdirSync(IMAGES_DEST, { recursive: true })

  let created = 0
  let skipped = 0
  let noImage = 0

  for (const work of works) {
    // Determine local image path
    const srcImg = path.join(imagesSource, `work-${work.work_id}.jpg`)
    const destFilename = `${prefix}-${work.work_id}.jpg`
    const destImg = path.join(IMAGES_DEST, destFilename)
    const localPath = `/images/artworks/${destFilename}`

    // Copy image if available and not already there
    if (fs.existsSync(srcImg)) {
      const srcStat = fs.statSync(srcImg)
      if (srcStat.size > 2000) {
        if (!fs.existsSync(destImg)) {
          fs.copyFileSync(srcImg, destImg)
        }
      }
    }

    const hasLocalImage = fs.existsSync(destImg) && fs.statSync(destImg).size > 2000

    // Check if already imported (by source_url or local_path)
    const existing = await prisma.artwork.findFirst({
      where: {
        artistId: artistRecord.id,
        OR: [
          { image_local_path: localPath },
          ...(work.source_url ? [{ source_url: work.source_url }] : []),
        ],
      },
    })

    if (existing) {
      skipped++
      continue
    }

    // Skip works with neither local image nor image URL (no useful data)
    if (!hasLocalImage && !work.image_url) {
      noImage++
      continue
    }

    // Museum
    let museumId: number | undefined
    if (work.holder_name && work.holder_city) {
      museumId = await getOrCreateMuseum(work.holder_name, work.holder_city)
    }

    await prisma.artwork.create({
      data: {
        artistId: artistRecord.id,
        museumId,
        title: normalizeArtworkTitle(work.title || 'Untitled'),
        year_start: work.year_start,
        year_end: work.year_end,
        medium_raw: work.medium_raw,
        type_normalized: work.type_normalized || 'painting',
        dimensions_raw: work.dimensions_raw,
        image_url: work.image_url,
        image_local_path: hasLocalImage ? localPath : null,
        source_url: work.source_url,
      },
    })
    created++

    if (created % 100 === 0) {
      console.log(`  Progress: ${created} created...`)
    }
  }

  console.log(`  Done: ${created} created, ${skipped} skipped, ${noImage} without image`)
}

async function main() {
  console.log('Seeding new artists into ArtTracker...')
  console.log(`Database: ${DB_PATH}`)

  for (const config of ARTISTS) {
    await seedArtist(config)
  }

  // Summary
  const artistCount = await prisma.artist.count()
  const artworkCount = await prisma.artwork.count()
  console.log(`\nDatabase totals: ${artistCount} artists, ${artworkCount} artworks`)
  console.log('Done.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
