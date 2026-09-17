/** Apply the Stripe billing tables (BillingCustomer/Subscription/BillingEvent/Entitlement) to the live Turso DB. */
import { createClient } from '@libsql/client'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(fs.readFileSync(resolve(scriptDir, '../.env.local'), 'utf8')
  .split('\n').filter(line => line.includes('=')).map(line => {
    const index = line.indexOf('=')
    return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^"|"$/g, '')]
  }))
if (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN) throw new Error('Turso credentials missing from .env.local')
const db = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN })

async function main() {
  await db.execute(`CREATE TABLE IF NOT EXISTS "BillingCustomer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BillingCustomer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`)
  await db.execute(`CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "billingCustomerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentPeriodEnd" DATETIME NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subscription_billingCustomerId_fkey" FOREIGN KEY ("billingCustomerId") REFERENCES "BillingCustomer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`)
  await db.execute(`CREATE TABLE IF NOT EXISTS "BillingEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stripeEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "processedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`)
  await db.execute(`CREATE TABLE IF NOT EXISTS "Entitlement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Entitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`)

  await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS "BillingCustomer_userId_key" ON "BillingCustomer"("userId")')
  await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS "BillingCustomer_stripeCustomerId_key" ON "BillingCustomer"("stripeCustomerId")')
  await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId")')
  await db.execute('CREATE INDEX IF NOT EXISTS "Subscription_billingCustomerId_idx" ON "Subscription"("billingCustomerId")')
  await db.execute('CREATE INDEX IF NOT EXISTS "Subscription_status_idx" ON "Subscription"("status")')
  await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS "BillingEvent_stripeEventId_key" ON "BillingEvent"("stripeEventId")')
  await db.execute('CREATE INDEX IF NOT EXISTS "BillingEvent_type_idx" ON "BillingEvent"("type")')
  await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS "Entitlement_userId_key" ON "Entitlement"("userId")')

  console.log('Billing tables applied to Turso.')
}

main()
