/**
 * Fix productie-DB (Turso): null shared placeholder image_urls
 *
 * Gebruik:
 *   node --env-file=.env.local scripts/fix-prod-db.mjs
 *
 * Wat het doet:
 *   1. Zoekt image_urls die door 2+ werken van dezelfde kunstenaar worden gedeeld
 *   2. Zet die op NULL zodat ze niet als neppe duplicaten verschijnen
 *   3. Rapporteert hoeveel gereset zijn
 */

import { createClient } from '@libsql/client'

const url   = process.env.TURSO_DATABASE_URL
const token = process.env.TURSO_AUTH_TOKEN

if (!url || !token) {
  console.error('TURSO_DATABASE_URL en TURSO_AUTH_TOKEN zijn vereist (zet ze in .env.local)')
  process.exit(1)
}

const db = createClient({ url, authToken: token })

async function main() {
  // 1. Vind gedeelde placeholder-urls
  const { rows: shared } = await db.execute(`
    SELECT image_url, COUNT(*) as cnt
    FROM Artwork
    WHERE image_url IS NOT NULL
    GROUP BY artistId, image_url
    HAVING COUNT(*) >= 2
    ORDER BY cnt DESC
  `)
  console.log(`Gedeelde image_urls gevonden: ${shared.length}`)
  for (const r of shared.slice(0, 5)) {
    console.log(`  ${r.image_url?.toString().substring(0, 70)} (${r.cnt}x)`)
  }

  if (shared.length === 0) {
    console.log('Niets te fixen — DB ziet er schoon uit.')
    return
  }

  // 2. Null ze
  const { rowsAffected } = await db.execute(`
    UPDATE Artwork SET image_url = NULL
    WHERE image_url IN (
      SELECT image_url FROM Artwork
      WHERE image_url IS NOT NULL
      GROUP BY artistId, image_url
      HAVING COUNT(*) >= 2
    )
  `)
  console.log(`\n✓ ${rowsAffected} artworks gereset naar NULL image_url`)

  // 3. Verifieer
  const { rows: check } = await db.execute(`
    SELECT COUNT(*) as cnt FROM Artwork
    WHERE image_url IS NOT NULL
    GROUP BY artistId, image_url
    HAVING COUNT(*) >= 2
  `)
  console.log(`Resterende gedeelde URLs na fix: ${check.length}`)
}

main().catch(e => { console.error(e); process.exit(1) })
