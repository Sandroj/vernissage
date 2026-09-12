import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

function createPrismaClient() {
  const url = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? ''
  const authToken = process.env.TURSO_AUTH_TOKEN

  const adapter = new PrismaLibSql({ url, authToken })
  return new PrismaClient({ adapter, log: ['error'] })
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export const hasImage = { OR: [{ image_url: { not: null } }, { image_local_path: { not: null } }] }

// Van Gogh Worldwide is the primary register for Vincent van Gogh. Legacy
// WikiArt rows without a verified F number stay in the database for audit and
// safe relation preservation, but are not part of the public catalogue.
export const primaryCatalogue = {
  OR: [
    { catalogue_id: { not: null } },
    { artist: { is: { name: { not: 'Vincent van Gogh' } } } },
  ],
}

export function localizeArtist<T extends { bio?: string | null; bio_en?: string | null; nationality?: string | null; nationality_en?: string | null }>(a: T, locale: string): T {
  if (locale !== 'en') return a
  return { ...a, bio: a.bio_en ?? a.bio, nationality: a.nationality_en ?? a.nationality }
}

export function localizeArtwork<T extends { attribution_note?: string | null; attribution_note_en?: string | null }>(a: T, locale: string): T {
  if (locale !== 'en') return a
  return { ...a, attribution_note: a.attribution_note_en ?? a.attribution_note }
}
