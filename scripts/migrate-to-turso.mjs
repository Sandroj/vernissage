/**
 * Migreer lokale SQLite database naar Turso
 * Gebruik: TURSO_URL=libsql://... TURSO_TOKEN=eyJ... node scripts/migrate-to-turso.mjs
 */

import { createRequire } from 'module'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@libsql/client'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))

const TURSO_URL   = process.env.TURSO_URL
const TURSO_TOKEN = process.env.TURSO_TOKEN

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('Stel TURSO_URL en TURSO_TOKEN in als omgevingsvariabelen')
  process.exit(1)
}

const Database = require('../node_modules/better-sqlite3')
const db = new Database(resolve(__dirname, '../dev.db'))

const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })

// Tabel volgorde (foreign key volgorde)
const TABLES = ['Artist', 'Museum', 'User', 'Account', 'Session', 'VerificationToken', 'Artwork', 'Seen', 'ArtistVote', 'Report']

async function migrate() {
  console.log('🚀 Start migratie naar Turso...\n')

  // Stap 1: schema aanmaken vanuit migrations
  console.log('1️⃣  Schema aanmaken...')
  const migrations = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%' ORDER BY rootpage").all()

  for (const m of migrations) {
    if (!m.sql) continue
    try {
      await turso.execute(m.sql)
      console.log(`   ✓ Tabel aangemaakt`)
    } catch (e) {
      if (e.message?.includes('already exists')) {
        console.log(`   ~ Tabel bestaat al`)
      } else {
        console.warn(`   ! ${e.message?.substring(0, 80)}`)
      }
    }
  }

  // Stap 2: indexes aanmaken
  const indexes = db.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL").all()
  for (const idx of indexes) {
    try { await turso.execute(idx.sql) } catch {}
  }

  // Stap 3: data per tabel
  console.log('\n2️⃣  Data migreren...')
  for (const table of TABLES) {
    try {
      const rows = db.prepare(`SELECT * FROM "${table}"`).all()
      if (rows.length === 0) { console.log(`   - ${table}: leeg`); continue }

      const cols = Object.keys(rows[0])
      const placeholders = cols.map(() => '?').join(', ')
      const sql = `INSERT OR IGNORE INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`

      // In batches van 50
      const BATCH = 50
      let inserted = 0
      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH)
        const statements = batch.map(row => ({
          sql,
          args: cols.map(c => {
            const v = row[c]
            if (v instanceof Date) return v.toISOString()
            return v ?? null
          })
        }))
        await turso.batch(statements, 'write')
        inserted += batch.length
      }
      console.log(`   ✓ ${table}: ${inserted} rijen`)
    } catch (e) {
      console.warn(`   ✗ ${table}: ${e.message?.substring(0, 100)}`)
    }
  }

  // Stap 4: _prisma_migrations
  try {
    const pm = db.prepare("SELECT * FROM _prisma_migrations").all()
    if (pm.length > 0) {
      await turso.execute(`CREATE TABLE IF NOT EXISTS _prisma_migrations (
        id TEXT PRIMARY KEY, checksum TEXT NOT NULL, finished_at DATETIME,
        migration_name TEXT NOT NULL, logs TEXT, rolled_back_at DATETIME,
        started_at DATETIME NOT NULL DEFAULT current_timestamp, applied_steps_count INT NOT NULL DEFAULT 0
      )`)
      for (const row of pm) {
        try {
          await turso.execute({
            sql: `INSERT OR IGNORE INTO _prisma_migrations VALUES (?,?,?,?,?,?,?,?)`,
            args: [row.id, row.checksum, row.finished_at, row.migration_name, row.logs, row.rolled_back_at, row.started_at, row.applied_steps_count]
          })
        } catch {}
      }
      console.log(`   ✓ _prisma_migrations: ${pm.length} rijen`)
    }
  } catch (e) {
    console.warn('   ! _prisma_migrations:', e.message?.substring(0, 60))
  }

  // Verificatie
  console.log('\n3️⃣  Verificatie...')
  for (const table of ['Artist', 'Artwork', 'Museum', 'User']) {
    try {
      const result = await turso.execute(`SELECT COUNT(*) as n FROM "${table}"`)
      console.log(`   ${table}: ${result.rows[0].n} rijen in Turso`)
    } catch (e) {
      console.warn(`   ! ${table}: ${e.message}`)
    }
  }

  console.log('\n✅ Migratie klaar!')
  turso.close()
}

migrate().catch(console.error)
