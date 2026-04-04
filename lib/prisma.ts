import { PrismaClient } from '@prisma/client'

// Production: Turso (libsql) — Development: lokale SQLite (better-sqlite3)
function createPrismaClient() {
  if (process.env.TURSO_DATABASE_URL) {
    // Productie: gebruik Turso
    const { PrismaLibSQL } = require('@prisma/adapter-libsql')
    const { createClient } = require('@libsql/client')
    const libsql = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({ adapter, log: ['error'] })
  } else {
    // Development: gebruik lokale SQLite
    const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3')
    const path = require('path')
    const DB_PATH = process.env.DATABASE_URL?.replace('file:', '').replace('file:/', '/') ?? path.resolve(process.cwd(), 'dev.db')
    const adapter = new PrismaBetterSqlite3({ url: DB_PATH })
    return new PrismaClient({ adapter, log: ['error'] })
  }
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
