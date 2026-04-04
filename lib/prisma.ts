import { PrismaClient } from '@prisma/client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAdapter = any

function createPrismaClient() {
  if (process.env.TURSO_DATABASE_URL) {
    // Productie: Turso (libsql)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaLibSQL } = require('@prisma/adapter-libsql')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@libsql/client')
    const libsql = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    const adapter: AnyAdapter = new PrismaLibSQL(libsql)
    return new PrismaClient({ adapter, log: ['error'] })
  } else {
    // Development: lokale SQLite
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path')
    const DB_PATH = process.env.DATABASE_URL?.replace('file:', '') ?? path.resolve(process.cwd(), 'dev.db')
    const adapter: AnyAdapter = new PrismaBetterSqlite3({ url: DB_PATH })
    return new PrismaClient({ adapter, log: ['error'] })
  }
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
