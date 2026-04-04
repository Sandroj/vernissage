/**
 * Update image_local_path in DB for artworks where image is now downloaded.
 * Run: ts-node --compiler-options '{"module":"CommonJS"}' prisma/update-image-paths.ts
 */

import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import BetterSqlite3 from 'better-sqlite3'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const DB_PATH = path.resolve(__dirname, '../dev.db')
const adapter = new PrismaBetterSqlite3({ url: DB_PATH })
const prisma = new PrismaClient({ adapter })

const IMAGES_DEST = path.resolve(__dirname, '../public/images/artworks')

const ARTIST_SOURCES = [
  { slug: 'vincent-van-gogh', prefix: 'vangogh', sourceDir: path.join(os.homedir(), 'claude-code/projects/art/sources/vangogh/images') },
  { slug: 'claude-monet', prefix: 'monet', sourceDir: path.join(os.homedir(), 'claude-code/projects/art/sources/monet/images') },
  { slug: 'gustav-klimt', prefix: 'klimt', sourceDir: path.join(os.homedir(), 'claude-code/projects/art/sources/klimt/images') },
]

async function main() {
  console.log('Updating image paths...')
  fs.mkdirSync(IMAGES_DEST, { recursive: true })

  for (const { slug, prefix, sourceDir } of ARTIST_SOURCES) {
    const artist = await prisma.artist.findUnique({ where: { slug } })
    if (!artist) {
      console.log(`Artist not found: ${slug}`)
      continue
    }

    // Get all artworks for this artist that have no local path
    const artworks = await prisma.artwork.findMany({
      where: { artistId: artist.id, image_local_path: null },
      select: { id: true, source_url: true },
    })

    console.log(`\n${artist.name}: ${artworks.length} artworks without local image`)

    let updated = 0
    let notFound = 0

    // Try to match artworks to downloaded images
    // Images are named work-{N}.jpg where N is the order in the source JSON
    // We need to rebuild the mapping from work_id

    // Load source JSON to get the work_id mapping
    const jsonPath = path.join(sourceDir, '..', 'data', `${prefix}_works.json`)
    if (!fs.existsSync(jsonPath)) {
      console.log(`  Source JSON not found: ${jsonPath}`)
      continue
    }

    const sourceWorks: { work_id: number; source_url: string | null }[] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
    const urlToWorkId = new Map<string, number>()
    for (const w of sourceWorks) {
      if (w.source_url) urlToWorkId.set(w.source_url, w.work_id)
    }

    for (const artwork of artworks) {
      const workId = artwork.source_url ? urlToWorkId.get(artwork.source_url) : null
      if (!workId) {
        notFound++
        continue
      }

      const srcImg = path.join(sourceDir, `work-${workId}.jpg`)
      if (!fs.existsSync(srcImg)) {
        notFound++
        continue
      }

      const stat = fs.statSync(srcImg)
      if (stat.size < 2000) {
        notFound++
        continue
      }

      const destFilename = `${prefix}-${workId}.jpg`
      const destImg = path.join(IMAGES_DEST, destFilename)

      if (!fs.existsSync(destImg)) {
        fs.copyFileSync(srcImg, destImg)
      }

      await prisma.artwork.update({
        where: { id: artwork.id },
        data: { image_local_path: `/images/artworks/${destFilename}` },
      })
      updated++

      if (updated % 100 === 0) {
        console.log(`  Updated ${updated}...`)
      }
    }

    console.log(`  Done: ${updated} updated, ${notFound} images not yet available`)
  }

  const withLocal = await prisma.artwork.count({ where: { image_local_path: { not: null } } })
  const total = await prisma.artwork.count()
  console.log(`\nDatabase: ${withLocal}/${total} artworks with local images`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
