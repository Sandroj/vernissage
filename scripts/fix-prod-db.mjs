/**
 * Fix productie-DB (Turso): null shared placeholder image_urls + dode WikiArt-URLs
 *
 * Gebruik:
 *   node --env-file=.env.local scripts/fix-prod-db.mjs
 *
 * Wat het doet:
 *   1. Nuilt image_urls die door 2+ werken gedeeld worden (placeholder-probleem)
 *   2. Nuilt WikiArt-URLs van werken zonder lokale kopie (waren al dood bij scrapen)
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
  // Stap 1: gedeelde placeholder-urls
  const { rows: shared } = await db.execute(`
    SELECT image_url, COUNT(*) as cnt
    FROM Artwork
    WHERE image_url IS NOT NULL
    GROUP BY artistId, image_url
    HAVING COUNT(*) >= 2
    ORDER BY cnt DESC
  `)
  console.log(`Stap 1 — Gedeelde image_urls: ${shared.length}`)
  if (shared.length > 0) {
    for (const r of shared.slice(0, 3)) {
      console.log(`  ${r.image_url?.toString().substring(0, 70)} (${r.cnt}x)`)
    }
    const { rowsAffected: n1 } = await db.execute(`
      UPDATE Artwork SET image_url = NULL
      WHERE image_url IN (
        SELECT image_url FROM Artwork
        WHERE image_url IS NOT NULL
        GROUP BY artistId, image_url
        HAVING COUNT(*) >= 2
      )
    `)
    console.log(`  ✓ ${n1} gereset`)
  } else {
    console.log('  Geen gevonden — al schoon.')
  }

  // Stap 2: WikiArt-URLs zonder lokale kopie (100% dood)
  const { rows: dead } = await db.execute(`
    SELECT COUNT(*) as cnt FROM Artwork
    WHERE image_url LIKE '%wikiart%'
    AND (image_local_path IS NULL OR image_local_path = '')
  `)
  const deadCount = Number(dead[0]?.cnt ?? 0)
  console.log(`\nStap 2 — WikiArt-URLs zonder lokale kopie: ${deadCount}`)
  if (deadCount > 0) {
    const { rowsAffected: n2 } = await db.execute(`
      UPDATE Artwork SET image_url = NULL
      WHERE image_url LIKE '%wikiart%'
      AND (image_local_path IS NULL OR image_local_path = '')
    `)
    console.log(`  ✓ ${n2} gereset`)
  } else {
    console.log('  Geen gevonden — al schoon.')
  }

  // Eindstand
  const { rows: total } = await db.execute(`SELECT COUNT(*) as cnt FROM Artwork WHERE image_url IS NOT NULL`)
  console.log(`\nEindstand: ${total[0]?.cnt} artworks met actieve image_url`)
}

main().catch(e => { console.error(e); process.exit(1) })
