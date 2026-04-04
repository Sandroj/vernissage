import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import * as path from 'path'

const DB_PATH = process.env.DATABASE_URL?.replace('file:', '') ?? path.resolve(process.cwd(), 'dev.db')
const adapter = new PrismaBetterSqlite3({ url: DB_PATH })

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter, log: ['error'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
