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

export function localizeArtist<T extends { bio?: string | null; bio_en?: string | null; nationality?: string | null; nationality_en?: string | null }>(a: T, locale: string): T {
  if (locale !== 'en') return a
  return { ...a, bio: a.bio_en ?? a.bio, nationality: a.nationality_en ?? a.nationality }
}
