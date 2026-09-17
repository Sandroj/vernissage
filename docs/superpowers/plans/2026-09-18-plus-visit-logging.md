# Plus Visit Logging + Photo-First Seen Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Plus subscribers log multiple dated visits to the same artwork (with photo/notes/rating each), and redesign the existing "mark as seen" modal so the photo is the prominent, inviting element for every user, free or Plus.

**Architecture:** A new `Visit` model (no unique constraint on user+artwork) sits alongside the existing `Seen` model (unchanged, still one row per user/artwork). Every time a `Visit` is created or deleted, the corresponding `Seen` row is synced to reflect the newest remaining visit, so none of the 11 existing places that read `Seen` need to change. A new `POST/GET /api/visits` and `DELETE /api/visits/[id]` are gated on `Entitlement.active`; the existing `/api/seen` route is untouched. A shared `VisitFormFields` component (photo-first layout, with client-side image compression) is used by both the redesigned free `SeenModal` and a new Plus-only `VisitModal`. A new `VisitHistory` component on the artwork page shows past visits to Plus users and an upsell card (linking to the already-built `/api/billing/checkout`) to everyone else.

**Tech Stack:** Next.js App Router, Prisma (SQLite/libSQL), NextAuth, next-intl, Tailwind, Jest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-18-plus-visit-logging-design.md`

## Global Constraints

- `Seen` model and `POST /api/seen` stay byte-for-byte unchanged in schema and behavior — every new write path goes through `Visit`.
- `POST/DELETE /api/visits*` are Plus-only regardless of whether it's the user's 1st or Nth visit for that artwork; `GET /api/visits` has no Plus gate (viewing history must survive a lapsed subscription).
- No photo storage migration in this plan — compression is a client-side stopgap only, mark it with a `ponytail:` comment.
- No rate limiting in this plan — tracked separately in HANDOFF.md backlog.
- Follow existing code style: NL-first UI copy via next-intl (`messages/nl.json` primary, `messages/en.json` mirrors it), Tailwind utility classes matching the existing warm/cream palette (`#faf6ee`, `#ed694c`, `#4256cc`, stone-* grays) already used in `seen-modal.tsx`.

---

### Task 1: Fix missing `@testing-library/dom` dev dependency

This is a known pre-existing gap (see HANDOFF.md, 17 September 2026): `@testing-library/react` needs `@testing-library/dom` as a peer, but it's never been added to `package.json`, so all three existing component test suites (`nav.test.tsx`, `progress-bar.test.tsx`, `seen-modal.test.tsx`) fail to even run. This plan adds three more component-level changes, so fix this first.

**Files:**
- Modify: `package.json` (devDependencies)

- [ ] **Step 1: Install the missing dependency**

Run: `npm install --save-dev @testing-library/dom`

- [ ] **Step 2: Run the full test suite and confirm the previously-broken suites now execute**

Run: `npx jest 2>&1 | tail -30`
Expected: `nav.test.tsx` and `progress-bar.test.tsx` now run (may pass or fail on their own assertions — that's fine, the point here is they *execute* instead of erroring on module resolution). `seen-modal.test.tsx` will now run too and will fail on a missing `onRemoved` prop — that's a pre-existing bug in the test, fixed in Task 8 when this plan touches that file. Don't fix it here.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add missing @testing-library/dom dev dependency

Component tests (nav, progress-bar, seen-modal) couldn't run at all
without this peer dependency of @testing-library/react. Needed to
TDD the new UI components in this plan."
```

---

### Task 2: Add the `Visit` model

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_visit_model/migration.sql` (generated, not hand-written)
- Create: `scripts/migrate-visit-model-to-turso.mjs`

**Interfaces:**
- Produces: Prisma model `Visit` with fields `id: Int`, `userId: String`, `artworkId: Int`, `dateSeen: DateTime`, `locationSeen: String?`, `notes: String?`, `rating: Int?`, `photo_url: String?`, `createdAt: DateTime`. No unique constraint on `(userId, artworkId)`.

- [ ] **Step 1: Add the model and relations to the schema**

In `prisma/schema.prisma`, find the `Seen` model (around line 131) and add the new `Visit` model directly after it:

```prisma
model Visit {
  id           Int      @id @default(autoincrement())
  userId       String
  artworkId    Int
  dateSeen     DateTime
  locationSeen String?
  notes        String?
  rating       Int?
  photo_url    String?
  createdAt    DateTime @default(now())
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  artwork      Artwork  @relation(fields: [artworkId], references: [id], onDelete: Cascade)

  @@index([userId, artworkId])
  @@index([artworkId])
}
```

Then add the reverse relation to `User` (find `seen Seen[]` in the `User` model, add a line after it):

```prisma
  visits            Visit[]
```

And to `Artwork` (find `seenBy Seen[]` in the `Artwork` model, add a line after it):

```prisma
  visits               Visit[]
```

- [ ] **Step 2: Generate the migration against local dev.db**

Run: `DATABASE_URL="file:./dev.db" npx prisma migrate dev --name add_visit_model --create-only`

This creates `prisma/migrations/<timestamp>_add_visit_model/migration.sql`. Open it and confirm it contains a `CREATE TABLE "Visit"` statement with the columns above and two `CREATE INDEX` statements — no `CREATE UNIQUE INDEX` on `(userId, artworkId)` (that's the whole point of this model).

- [ ] **Step 3: Apply the migration to dev.db**

Run: `DATABASE_URL="file:./dev.db" npx prisma migrate deploy && npx prisma generate`

- [ ] **Step 4: Verify the table exists with the right shape**

Run: `sqlite3 dev.db ".schema Visit"`
Expected: a `CREATE TABLE "Visit"` statement with no unique index on `(userId, artworkId)`, matching Step 2.

- [ ] **Step 5: Write the Turso sync script**

Create `scripts/migrate-visit-model-to-turso.mjs` (same pattern as the existing `scripts/migrate-billing-models-to-turso.mjs` — read it first for the exact env-loading boilerplate):

```javascript
/** Apply the Visit table to the live Turso DB. */
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
  await db.execute(`CREATE TABLE IF NOT EXISTS "Visit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "artworkId" INTEGER NOT NULL,
    "dateSeen" DATETIME NOT NULL,
    "locationSeen" TEXT,
    "notes" TEXT,
    "rating" INTEGER,
    "photo_url" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Visit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Visit_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`)
  await db.execute('CREATE INDEX IF NOT EXISTS "Visit_userId_artworkId_idx" ON "Visit"("userId", "artworkId")')
  await db.execute('CREATE INDEX IF NOT EXISTS "Visit_artworkId_idx" ON "Visit"("artworkId")')
  console.log('Visit table applied to Turso.')
}

main()
```

Do **not** run this script against Turso as part of this task — it lands in the same PR/commit as the rest of this plan, and Turso production should only be migrated once the full feature is reviewed and ready to ship (matches how `migrate-billing-models-to-turso.mjs` was handled: committed, run separately once approved).

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations scripts/migrate-visit-model-to-turso.mjs
git commit -m "Add Visit model for Plus repeat-visit logging

No unique constraint on (userId, artworkId), unlike Seen — that's
the mechanism that allows multiple logged visits per artwork. Seen
itself is untouched; it becomes a synced 'latest visit' cache once
the /api/visits routes land in later tasks."
```

---

### Task 3: `hasActiveEntitlement` helper

**Files:**
- Modify: `lib/entitlement.ts`
- Test: `__tests__/lib/entitlement.test.ts`

**Interfaces:**
- Produces: `hasActiveEntitlement(userId: string): Promise<boolean>`, exported from `lib/entitlement.ts`.

- [ ] **Step 1: Write the failing test**

Add to `__tests__/lib/entitlement.test.ts` (this file already exists with tests for `isActiveSubscriptionStatus` — add below them, and add the mock/import at the top of the file):

```typescript
jest.mock('@/lib/prisma', () => ({
  prisma: { entitlement: { findUnique: jest.fn() } },
}))

import { prisma } from '@/lib/prisma'
import { hasActiveEntitlement } from '@/lib/entitlement'

describe('hasActiveEntitlement', () => {
  afterEach(() => jest.clearAllMocks())

  it('returns true when the entitlement row is active', async () => {
    ;(prisma.entitlement.findUnique as jest.Mock).mockResolvedValue({ active: true })
    expect(await hasActiveEntitlement('user-1')).toBe(true)
  })

  it('returns false when the entitlement row is inactive', async () => {
    ;(prisma.entitlement.findUnique as jest.Mock).mockResolvedValue({ active: false })
    expect(await hasActiveEntitlement('user-1')).toBe(false)
  })

  it('returns false when no entitlement row exists', async () => {
    ;(prisma.entitlement.findUnique as jest.Mock).mockResolvedValue(null)
    expect(await hasActiveEntitlement('user-1')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/lib/entitlement.test.ts -v`
Expected: FAIL — `hasActiveEntitlement is not a function` (or similar import error), since it doesn't exist yet.

- [ ] **Step 3: Implement**

In `lib/entitlement.ts`, add the import and function (the file currently only has `isActiveSubscriptionStatus`, keep that as-is):

```typescript
import { prisma } from '@/lib/prisma'

export async function hasActiveEntitlement(userId: string): Promise<boolean> {
  const entitlement = await prisma.entitlement.findUnique({ where: { userId } })
  return entitlement?.active ?? false
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/lib/entitlement.test.ts -v`
Expected: PASS, all tests including the pre-existing `isActiveSubscriptionStatus` ones.

- [ ] **Step 5: Commit**

```bash
git add lib/entitlement.ts __tests__/lib/entitlement.test.ts
git commit -m "Add hasActiveEntitlement helper for Plus-gating routes"
```

---

### Task 4: `lib/image-compress.ts`

**Files:**
- Create: `lib/image-compress.ts`
- Test: `__tests__/lib/image-compress.test.ts`

**Interfaces:**
- Produces: `computeTargetDimensions(width: number, height: number, maxDimension?: number): { width: number; height: number }` (pure, tested) and `compressImageDataUrl(dataUrl: string, maxDimension?: number, quality?: number): Promise<string>` (browser glue using `Image`/`canvas`, not unit tested — see note in Step 5).
- Consumes: nothing from earlier tasks.

- [ ] **Step 1: Write the failing test for the pure function**

Create `__tests__/lib/image-compress.test.ts`:

```typescript
import { computeTargetDimensions } from '@/lib/image-compress'

describe('computeTargetDimensions', () => {
  it('leaves an image within the max dimension unchanged', () => {
    expect(computeTargetDimensions(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })

  it('downscales a landscape image proportionally', () => {
    expect(computeTargetDimensions(3200, 1600, 1600)).toEqual({ width: 1600, height: 800 })
  })

  it('downscales a portrait image proportionally', () => {
    expect(computeTargetDimensions(1600, 3200, 1600)).toEqual({ width: 800, height: 1600 })
  })

  it('treats an image exactly at the max dimension as unchanged', () => {
    expect(computeTargetDimensions(1600, 1600, 1600)).toEqual({ width: 1600, height: 1600 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/lib/image-compress.test.ts -v`
Expected: FAIL — module `@/lib/image-compress` doesn't exist yet.

- [ ] **Step 3: Implement**

Create `lib/image-compress.ts`:

```typescript
// ponytail: client-side compression only, still writes a data-URL into the
// DB (Seen.photo_url/Visit.photo_url) — upgrade path is the R2 private-
// photo-storage migration already planned in the production-scale doc.
export const MAX_PHOTO_DIMENSION = 1600
const JPEG_QUALITY = 0.82

export function computeTargetDimensions(
  width: number,
  height: number,
  maxDimension: number = MAX_PHOTO_DIMENSION
): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) return { width, height }
  const scale = maxDimension / Math.max(width, height)
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not decode image'))
    img.src = src
  })
}

export async function compressImageDataUrl(
  dataUrl: string,
  maxDimension: number = MAX_PHOTO_DIMENSION,
  quality: number = JPEG_QUALITY
): Promise<string> {
  try {
    const img = await loadImage(dataUrl)
    const { width, height } = computeTargetDimensions(img.naturalWidth, img.naturalHeight, maxDimension)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return dataUrl
    ctx.drawImage(img, 0, 0, width, height)
    return canvas.toDataURL('image/jpeg', quality)
  } catch {
    return dataUrl
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/lib/image-compress.test.ts -v`
Expected: PASS, all 4 cases.

- [ ] **Step 5: Note on `compressImageDataUrl`**

This function is deliberately not unit tested: it needs a real `Image`/`canvas` decode/draw, which jsdom doesn't implement without the (unbundled) `canvas` npm package. Its logic is a thin wrapper around `computeTargetDimensions` (tested above) plus a try/catch fallback to the original data-URL — correctness is verified manually in Task 7 by uploading a large photo in the browser and checking the resulting file size, not by a jest test. Don't add the `canvas` package to make this testable — that's a heavier dependency than the value here justifies.

- [ ] **Step 6: Commit**

```bash
git add lib/image-compress.ts __tests__/lib/image-compress.test.ts
git commit -m "Add client-side photo compression before data-URL storage"
```

---

### Task 5: `POST /api/visits` and `GET /api/visits`

**Files:**
- Create: `app/api/visits/route.ts`

**Interfaces:**
- Consumes: `hasActiveEntitlement(userId: string): Promise<boolean>` from Task 3.
- Produces: `POST /api/visits` (body `{ artworkId: number, dateSeen: string, locationSeen?: string, notes?: string, rating?: number, photo_url?: string }`, returns the created `Visit` as JSON, 201) and `GET /api/visits?artworkId=<id>` (returns `Visit[]` for the logged-in user, newest first).

- [ ] **Step 1: Implement the route**

Create `app/api/visits/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasActiveEntitlement } from '@/lib/entitlement'

// POST /api/visits — Plus-only. Logs an additional visit to an artwork and
// keeps the existing Seen row (read by 11 other places in the app) synced
// to the newest visit, so none of those call sites need to change.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  if (!(await hasActiveEntitlement(session.user.id))) {
    return NextResponse.json({ error: 'Dit vereist Pinacot Plus.' }, { status: 403 })
  }

  const { artworkId, dateSeen, locationSeen, notes, rating, photo_url } = await req.json()
  const userId = session.user.id

  const visit = await prisma.visit.create({
    data: {
      userId,
      artworkId,
      dateSeen: new Date(dateSeen),
      locationSeen: locationSeen || null,
      notes: notes || null,
      rating: rating ?? null,
      photo_url: photo_url || null,
    },
  })

  await prisma.seen.upsert({
    where: { userId_artworkId: { userId, artworkId } },
    update: { dateSeen: visit.dateSeen, locationSeen: visit.locationSeen, notes: visit.notes, rating: visit.rating, photo_url: visit.photo_url },
    create: { userId, artworkId, dateSeen: visit.dateSeen, locationSeen: visit.locationSeen, notes: visit.notes, rating: visit.rating, photo_url: visit.photo_url },
  })

  return NextResponse.json(visit, { status: 201 })
}

// GET /api/visits?artworkId=123 — no Plus gate: a lapsed subscriber must
// still be able to see visits they logged while they were subscribed.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const artworkId = parseInt(new URL(req.url).searchParams.get('artworkId') ?? '')
  if (!artworkId) return NextResponse.json({ error: 'artworkId is verplicht' }, { status: 400 })

  const visits = await prisma.visit.findMany({
    where: { userId: session.user.id, artworkId },
    orderBy: { dateSeen: 'desc' },
  })

  return NextResponse.json(visits)
}
```

- [ ] **Step 2: Build and typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -v "testing-library\|seen-modal.test.tsx"`
Expected: no output (clean).

- [ ] **Step 3: Manual verification against local dev.db**

This codebase has no existing tests for API routes (checked: `__tests__/` only covers `lib/` and `components/`) — route behavior is verified manually against `dev.db`, matching how `/api/billing/checkout` was verified earlier this project. Start the dev server against the local database explicitly (never against Turso — see the `dev.db vs Turso` warning in `AGENTS.md`):

```bash
DATABASE_URL="file:./dev.db" npm run dev
```

In another terminal, with a logged-in session cookie (or via the browser devtools console on a logged-in page, matching the pattern used to test `/api/billing/checkout` earlier — `fetch('/api/visits', {...})`), confirm:
- A user with no `Entitlement` row gets `403` from `POST /api/visits`.
- After manually setting `active = 1` on that user's `Entitlement` row (`sqlite3 dev.db "UPDATE Entitlement SET active = 1 WHERE userId = '<id>'"` — insert a row first if none exists), the same `POST /api/visits` call returns `201` and a `Visit` row appears in `dev.db`, and the corresponding `Seen` row's `dateSeen`/`notes`/etc. now match the new visit.
- `GET /api/visits?artworkId=<id>` returns the visit, newest first, for that user regardless of entitlement status.

Stop the dev server when done (`lsof -ti:3000 | xargs kill -9`).

- [ ] **Step 4: Commit**

```bash
git add app/api/visits/route.ts
git commit -m "Add POST/GET /api/visits, Plus-gated visit logging"
```

---

### Task 6: `DELETE /api/visits/[id]`

**Files:**
- Create: `app/api/visits/[id]/route.ts`

**Interfaces:**
- Consumes: `hasActiveEntitlement` from Task 3.
- Produces: `DELETE /api/visits/[id]`, `200 { ok: true }` on success, `404` if the visit doesn't exist or belongs to someone else, `403` if the caller isn't Plus.

- [ ] **Step 1: Implement the route**

Create `app/api/visits/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasActiveEntitlement } from '@/lib/entitlement'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  if (!(await hasActiveEntitlement(session.user.id))) {
    return NextResponse.json({ error: 'Dit vereist Pinacot Plus.' }, { status: 403 })
  }

  const userId = session.user.id
  let deleted
  try {
    deleted = await prisma.visit.delete({
      where: { id: parseInt(params.id), userId },
    })
  } catch {
    return NextResponse.json({ error: 'Bezoek niet gevonden' }, { status: 404 })
  }

  const latest = await prisma.visit.findFirst({
    where: { userId, artworkId: deleted.artworkId },
    orderBy: { dateSeen: 'desc' },
  })

  if (latest) {
    await prisma.seen.update({
      where: { userId_artworkId: { userId, artworkId: deleted.artworkId } },
      data: { dateSeen: latest.dateSeen, locationSeen: latest.locationSeen, notes: latest.notes, rating: latest.rating, photo_url: latest.photo_url },
    }).catch(() => {}) // no Seen row to update — fine, nothing to sync
  }
  // No visits left: Seen stays exactly as it was, per the spec's edge cases.

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Build and typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -v "testing-library\|seen-modal.test.tsx"`
Expected: no output.

- [ ] **Step 3: Manual verification against local dev.db**

Same setup as Task 5 Step 3 (`DATABASE_URL="file:./dev.db" npm run dev`, entitled test user). Log two visits for the same artwork via `POST /api/visits`, note their ids and dates. `DELETE /api/visits/<newest-id>` and confirm via `sqlite3 dev.db "SELECT * FROM Seen WHERE artworkId = <id>"` that `Seen` now reflects the remaining (older) visit's data, not the deleted one. Delete the last remaining visit and confirm `Seen` is untouched (still has the older visit's data, doesn't get cleared).

- [ ] **Step 4: Commit**

```bash
git add "app/api/visits/[id]/route.ts"
git commit -m "Add DELETE /api/visits/[id] with Seen resync on removal"
```

---

### Task 7: `components/visit-form-fields.tsx` (shared photo-first fields)

**Files:**
- Create: `components/visit-form-fields.tsx`
- Modify: `messages/nl.json`, `messages/en.json`

**Interfaces:**
- Consumes: `compressImageDataUrl` from Task 4.
- Produces: `<VisitFormFields date locationValue onLocationChange rating onRatingChange notes onNotesChange photoUrl onPhotoUrlChange />` — a controlled, presentational component (no internal state beyond a transient "compressing" flag), used by both `SeenModal` (Task 8) and `VisitModal` (Task 9).

- [ ] **Step 1: Add the shared translation namespace**

In `messages/nl.json`, remove these keys from the `SeenModal` object (they move to a new `VisitForm` namespace so both modals can share them): `date`, `location`, `rating`, `notes`, `notesPlaceholder`, `photo`, `photoUpload`, `photoUrlPlaceholder`, `photoPreview`, `removePhoto`. Add a new top-level `VisitForm` object with the same keys, updating the photo copy per the spec's photo-first redesign:

```json
"VisitForm": {
  "date": "Datum",
  "location": "Locatie",
  "rating": "Waardering",
  "notes": "Notitie",
  "notesPlaceholder": "Wat vond je van dit werk?",
  "photo": "Voeg een foto toe",
  "photoHint": "Bewijs dat je er was",
  "photoUpload": "Foto maken of uploaden",
  "photoUrlPlaceholder": "Of voeg een foto-URL in...",
  "photoPreview": "Voorbeeld van upload",
  "removePhoto": "Foto verwijderen",
  "compressing": "Foto verkleinen..."
}
```

`SeenModal` in `messages/nl.json` keeps only: `editTitle`, `newTitle`, `saving`, `save`, `removeSeen`.

Mirror the exact same restructuring in `messages/en.json`:

```json
"VisitForm": {
  "date": "Date",
  "location": "Location",
  "rating": "Rating",
  "notes": "Notes",
  "notesPlaceholder": "What did you think of this work?",
  "photo": "Add a photo",
  "photoHint": "Prove you were there",
  "photoUpload": "Take or upload a photo",
  "photoUrlPlaceholder": "Or paste a photo URL...",
  "photoPreview": "Upload preview",
  "removePhoto": "Remove photo",
  "compressing": "Compressing photo..."
}
```

- [ ] **Step 2: Create the component**

Create `components/visit-form-fields.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { CalendarIcon } from 'lucide-react'
import MuseumSearch from '@/components/museum-search'
import StarRating from '@/components/star-rating'
import { compressImageDataUrl } from '@/lib/image-compress'
import { useTranslations, useFormatter } from 'next-intl'

interface VisitFormFieldsProps {
  date: Date
  onDateChange: (date: Date) => void
  locationValue: string
  onLocationChange: (value: string) => void
  rating: number | null
  onRatingChange: (value: number | null) => void
  notes: string
  onNotesChange: (value: string) => void
  photoUrl: string
  onPhotoUrlChange: (value: string) => void
}

export default function VisitFormFields({
  date,
  onDateChange,
  locationValue,
  onLocationChange,
  rating,
  onRatingChange,
  notes,
  onNotesChange,
  photoUrl,
  onPhotoUrlChange,
}: VisitFormFieldsProps) {
  const [calOpen, setCalOpen] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const t = useTranslations('VisitForm')
  const fmt = useFormatter()

  async function handleFileSelected(file: File) {
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const raw = ev.target?.result as string
      setCompressing(true)
      const compressed = await compressImageDataUrl(raw)
      setCompressing(false)
      onPhotoUrlChange(compressed)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-4">
      {/* Foto — bovenaan en groot, het centrale element van de flow */}
      <div className="space-y-2">
        <div className="text-center">
          <p className="text-base font-medium text-stone-800">{t('photo')}</p>
          <p className="text-xs text-stone-500">{t('photoHint')}</p>
        </div>

        {photoUrl ? (
          <div className="relative">
            <img src={photoUrl} alt={t('photoPreview')} className="w-full h-56 object-cover rounded-2xl" />
            <button
              type="button"
              onClick={() => onPhotoUrlChange('')}
              aria-label={t('removePhoto')}
              className="absolute top-2 right-2 bg-black/70 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-black/90"
            >
              ×
            </button>
          </div>
        ) : (
          <label className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#ed694c]/40 bg-[#ed694c]/5 cursor-pointer transition-colors text-sm text-[#ed694c] hover:border-[#ed694c]/70 hover:bg-[#ed694c]/10">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileSelected(file)
              }}
            />
            <span className="text-2xl">📷</span>
            <span>{compressing ? t('compressing') : t('photoUpload')}</span>
          </label>
        )}

        {!photoUrl && (
          <input
            type="url"
            value={photoUrl}
            onChange={(e) => onPhotoUrlChange(e.target.value)}
            placeholder={t('photoUrlPlaceholder')}
            className="w-full bg-white/70 border border-black/10 rounded-lg px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#4256cc]/40"
          />
        )}
      </div>

      {/* Datum */}
      <div className="space-y-1.5">
        <label className="text-xs text-stone-500 uppercase tracking-widest">{t('date')}</label>
        <Popover open={calOpen} onOpenChange={setCalOpen}>
          <PopoverTrigger
            render={
              <Button variant="outline" className="w-full justify-start gap-2 bg-white/70 border-black/10 text-stone-800 hover:bg-white" />
            }
          >
            <CalendarIcon size={14} className="text-stone-500" />
            {fmt.dateTime(date, { day: 'numeric', month: 'long', year: 'numeric' })}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => { if (d) { onDateChange(d); setCalOpen(false) } }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Locatie */}
      <div className="space-y-1.5">
        <label className="text-xs text-stone-500 uppercase tracking-widest">{t('location')}</label>
        <MuseumSearch value={locationValue} onChange={onLocationChange} />
      </div>

      {/* Waardering */}
      <div className="space-y-1.5">
        <label className="text-xs text-stone-500 uppercase tracking-widest">{t('rating')}</label>
        <StarRating value={rating} onChange={onRatingChange} />
      </div>

      {/* Notitie */}
      <div className="space-y-1.5">
        <label className="text-xs text-stone-500 uppercase tracking-widest">{t('notes')}</label>
        <Textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={t('notesPlaceholder')}
          className="bg-white/70 border-black/10 text-stone-800 resize-none placeholder:text-stone-400"
          rows={3}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build and typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -v "testing-library\|seen-modal.test.tsx"`
Expected: no output. (This component isn't used anywhere yet, but it must still compile cleanly.)

- [ ] **Step 3: Commit**

```bash
git add components/visit-form-fields.tsx messages/nl.json messages/en.json
git commit -m "Add shared photo-first VisitFormFields component

Extracted from the existing seen-modal.tsx field layout, with the
photo moved to the top as the largest, most inviting element instead
of a small upload box at the bottom. Wired to the new client-side
compression from lib/image-compress.ts. Not used by any screen yet —
seen-modal.tsx switches to it in the next task."
```

---

### Task 8: Redesign `components/seen-modal.tsx` to use `VisitFormFields`

**Files:**
- Modify: `components/seen-modal.tsx`
- Modify: `__tests__/components/seen-modal.test.tsx`

**Interfaces:**
- Consumes: `<VisitFormFields>` from Task 7.
- Produces: no change to `SeenModal`'s own props or to `/api/seen` — purely an internal layout change.

- [ ] **Step 1: Fix the pre-existing test bug and update the mock for the new field component**

`__tests__/components/seen-modal.test.tsx` is missing the required `onRemoved` prop (a pre-existing bug, unrelated to this plan, now surfaced because Task 1 made this suite runnable again). It also needs its mocks extended for the fields that `VisitFormFields` pulls in transitively — the existing mocks for `museum-search`, `star-rating`, `ui/calendar`, `ui/button`, `ui/textarea`, `ui/popover`, `ui/dialog` are unaffected since `VisitFormFields` imports the exact same modules by the exact same paths. Replace the test body:

```tsx
import { render, screen } from '@testing-library/react'
import SeenModal from '@/components/seen-modal'

jest.mock('@/components/museum-search', () => () => <div>MuseumSearch</div>)
jest.mock('@/components/star-rating', () => () => <div>StarRating</div>)
jest.mock('@/components/ui/calendar', () => ({ Calendar: () => <div>Calendar</div> }))
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, className }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}))
jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}))
jest.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />,
}))
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('SeenModal', () => {
  it('toont titel van het kunstwerk', () => {
    render(
      <SeenModal
        artworkId={1}
        artworkTitle="Colorful Life"
        open={true}
        onOpenChange={jest.fn()}
        onSaved={jest.fn()}
        onRemoved={jest.fn()}
      />
    )
    expect(screen.getByText('Colorful Life')).toBeInTheDocument()
    expect(screen.getByText('Markeer als gezien')).toBeInTheDocument()
  })
})
```

(Only the `onRemoved={jest.fn()}` line is new — everything else is unchanged from the current file.)

- [ ] **Step 2: Run test to verify it fails against the current (pre-redesign) component**

Run: `npx jest __tests__/components/seen-modal.test.tsx -v`
Expected: PASS already, actually — adding the missing prop alone fixes the TS/runtime error. This step confirms that baseline before you change the component itself. If it doesn't pass, stop and re-check Task 1 landed correctly first.

- [ ] **Step 3: Redesign the component**

Replace `components/seen-modal.tsx` entirely:

```tsx
'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import VisitFormFields from '@/components/visit-form-fields'
import { useTranslations } from 'next-intl'

interface SeenModalProps {
  artworkId: number
  artworkTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
  existingSeen?: {
    id: number
    dateSeen: string
    locationSeen?: string | null
    notes?: string | null
    rating?: number | null
    photo_url?: string | null
  } | null
  onSaved: () => void
  onRemoved: () => void
}

export default function SeenModal({
  artworkId,
  artworkTitle,
  open,
  onOpenChange,
  existingSeen,
  onSaved,
  onRemoved,
}: SeenModalProps) {
  const [date, setDate] = useState<Date>(
    existingSeen ? new Date(existingSeen.dateSeen) : new Date()
  )
  const [location, setLocation] = useState(existingSeen?.locationSeen ?? '')
  const [notes, setNotes] = useState(existingSeen?.notes ?? '')
  const [rating, setRating] = useState<number | null>(existingSeen?.rating ?? null)
  const [photoUrl, setPhotoUrl] = useState(existingSeen?.photo_url ?? '')
  const [saving, setSaving] = useState(false)
  const t = useTranslations('SeenModal')

  async function handleSave() {
    setSaving(true)
    await fetch('/api/seen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artworkId,
        dateSeen: date.toISOString(),
        locationSeen: location || null,
        notes: notes || null,
        rating,
        photo_url: photoUrl || null,
      }),
    })
    setSaving(false)
    onOpenChange(false)
    onSaved()
  }

  async function handleRemove() {
    setSaving(true)
    const res = await fetch('/api/seen', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artworkId }),
    })
    setSaving(false)
    if (!res.ok) return
    onOpenChange(false)
    onRemoved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-2xl bg-[#faf6ee] border-black/10 p-5 sm:max-w-md sm:rounded-2xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium text-stone-900">
            {existingSeen ? t('editTitle') : t('newTitle')}
          </DialogTitle>
          <p className="max-w-full break-words text-stone-500 text-sm">{artworkTitle}</p>
          {existingSeen && (
            <Button type="button" variant="outline" onClick={handleRemove} disabled={saving} className="mt-1 h-9 w-full rounded-full border-red-200 bg-red-50/50 text-xs text-red-700 hover:bg-red-50">
              {t('removeSeen')}
            </Button>
          )}
        </DialogHeader>

        <div className="pt-2">
          <VisitFormFields
            date={date}
            onDateChange={setDate}
            locationValue={location}
            onLocationChange={setLocation}
            rating={rating}
            onRatingChange={setRating}
            notes={notes}
            onNotesChange={setNotes}
            photoUrl={photoUrl}
            onPhotoUrlChange={setPhotoUrl}
          />

          <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-between">
            <Button onClick={handleSave} disabled={saving} className="h-11 flex-1 rounded-full bg-[#ed694c] hover:bg-[#db573c] border-0 text-white">
              {saving ? t('saving') : t('save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Run test to verify it still passes**

Run: `npx jest __tests__/components/seen-modal.test.tsx -v`
Expected: PASS — the title and button text assertions still hold, since `editTitle`/`newTitle`/`save` copy didn't change, only the field layout inside.

- [ ] **Step 5: Full test suite, typecheck, build**

Run: `npx jest 2>&1 | tail -15 && npx tsc --noEmit 2>&1 | grep -v "testing-library" && npm run build 2>&1 | tail -20`
Expected: all suites pass or fail only on the still-pre-existing, unrelated failures noted in HANDOFF.md (none of which are the seen-modal suite anymore); tsc clean; build succeeds.

- [ ] **Step 6: Manual browser verification**

Start the app against local `dev.db` (`DATABASE_URL="file:./dev.db" npm run dev`), open an artwork page, click "Markeer als gezien", and confirm the photo field is now the large, top element with the new copy, and that uploading a large photo (a few MB) results in a visibly smaller `photo_url` in the saved `Seen` row (`sqlite3 dev.db "SELECT length(photo_url) FROM Seen WHERE artworkId = <id>"` before/after) than the original file size would suggest — this is the manual check standing in for the untested `compressImageDataUrl`, per Task 4 Step 5.

- [ ] **Step 7: Commit**

```bash
git add components/seen-modal.tsx __tests__/components/seen-modal.test.tsx
git commit -m "Redesign seen-modal.tsx to lead with the photo

Applies to every user, free or Plus — the photo is now the largest,
topmost element instead of a small upload box at the bottom, with
inviting copy ('bewijs dat je er was'). Behavior and /api/seen
contract are unchanged; this is a layout change built on the shared
VisitFormFields component. Also fixes a pre-existing missing-prop bug
in the component test."
```

---

### Task 9: `components/visit-modal.tsx` (Plus add-visit modal)

**Files:**
- Create: `components/visit-modal.tsx`
- Modify: `messages/nl.json`, `messages/en.json`

**Interfaces:**
- Consumes: `<VisitFormFields>` from Task 7.
- Produces: `<VisitModal artworkId artworkTitle open onOpenChange onSaved />` — posts to `POST /api/visits`.

- [ ] **Step 1: Add translations**

Add to `messages/nl.json`:

```json
"VisitModal": {
  "title": "Nog een bezoek toevoegen",
  "saving": "Opslaan...",
  "save": "Bezoek opslaan"
}
```

And to `messages/en.json`:

```json
"VisitModal": {
  "title": "Add another visit",
  "saving": "Saving...",
  "save": "Save visit"
}
```

- [ ] **Step 2: Create the component**

Create `components/visit-modal.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import VisitFormFields from '@/components/visit-form-fields'
import { useTranslations } from 'next-intl'

interface VisitModalProps {
  artworkId: number
  artworkTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export default function VisitModal({ artworkId, artworkTitle, open, onOpenChange, onSaved }: VisitModalProps) {
  const [date, setDate] = useState<Date>(new Date())
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [photoUrl, setPhotoUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const t = useTranslations('VisitModal')

  async function handleSave() {
    setSaving(true)
    await fetch('/api/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artworkId,
        dateSeen: date.toISOString(),
        locationSeen: location || null,
        notes: notes || null,
        rating,
        photo_url: photoUrl || null,
      }),
    })
    setSaving(false)
    setDate(new Date())
    setLocation('')
    setNotes('')
    setRating(null)
    setPhotoUrl('')
    onOpenChange(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-2xl bg-[#faf6ee] border-black/10 p-5 sm:max-w-md sm:rounded-2xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium text-stone-900">{t('title')}</DialogTitle>
          <p className="max-w-full break-words text-stone-500 text-sm">{artworkTitle}</p>
        </DialogHeader>

        <div className="pt-2">
          <VisitFormFields
            date={date}
            onDateChange={setDate}
            locationValue={location}
            onLocationChange={setLocation}
            rating={rating}
            onRatingChange={setRating}
            notes={notes}
            onNotesChange={setNotes}
            photoUrl={photoUrl}
            onPhotoUrlChange={setPhotoUrl}
          />

          <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-between">
            <Button onClick={handleSave} disabled={saving} className="h-11 flex-1 rounded-full bg-[#ed694c] hover:bg-[#db573c] border-0 text-white">
              {saving ? t('saving') : t('save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Build and typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -v "testing-library\|seen-modal.test.tsx"`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add components/visit-modal.tsx messages/nl.json messages/en.json
git commit -m "Add VisitModal for Plus repeat-visit logging

Not wired into any page yet — VisitHistory (next task) renders it."
```

---

### Task 10: `components/visit-history.tsx` and wiring into the artwork page

**Files:**
- Create: `components/visit-history.tsx`
- Modify: `app/artworks/[id]/artwork-detail-client.tsx`
- Modify: `app/artworks/[id]/page.tsx`
- Modify: `messages/nl.json`, `messages/en.json`

**Interfaces:**
- Consumes: `<VisitModal>` from Task 9, `hasActiveEntitlement` from Task 3 (called server-side in `page.tsx`).
- Produces: `<VisitHistory artworkId artworkTitle isPlus />` — fetches `GET /api/visits`, renders the list, an "add visit" button for Plus users, and an upsell card (calling `POST /api/billing/checkout`) for everyone else.

- [ ] **Step 1: Add translations**

Add to `messages/nl.json`:

```json
"VisitHistory": {
  "title": "Eerdere bezoeken",
  "addVisit": "Nog een bezoek toevoegen",
  "deleteVisit": "Verwijderen",
  "upsellTitle": "Bewaar meerdere bezoeken",
  "upsellBody": "Bewaar meerdere bezoeken aan dit werk met Pinacot Plus — €24,99/jaar.",
  "upgradeButton": "Upgrade naar Plus"
}
```

Add to `messages/en.json`:

```json
"VisitHistory": {
  "title": "Earlier visits",
  "addVisit": "Add another visit",
  "deleteVisit": "Delete",
  "upsellTitle": "Save more than one visit",
  "upsellBody": "Save multiple visits to this artwork with Pinacot Plus — €24.99/year.",
  "upgradeButton": "Upgrade to Plus"
}
```

- [ ] **Step 2: Create the component**

Create `components/visit-history.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import VisitModal from '@/components/visit-modal'
import { useTranslations, useFormatter } from 'next-intl'

interface Visit {
  id: number
  dateSeen: string
  locationSeen: string | null
  notes: string | null
  photo_url: string | null
}

interface VisitHistoryProps {
  artworkId: number
  artworkTitle: string
  isPlus: boolean
}

export default function VisitHistory({ artworkId, artworkTitle, isPlus }: VisitHistoryProps) {
  const [visits, setVisits] = useState<Visit[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const t = useTranslations('VisitHistory')
  const fmt = useFormatter()

  async function refresh() {
    const res = await fetch(`/api/visits?artworkId=${artworkId}`)
    if (res.ok) setVisits(await res.json())
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artworkId])

  async function handleDelete(id: number) {
    const res = await fetch(`/api/visits/${id}`, { method: 'DELETE' })
    if (res.ok) refresh()
  }

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-black/10 bg-white/50 p-4">
      <p className="text-xs text-stone-500 uppercase tracking-widest">{t('title')}</p>

      {visits.length > 0 && (
        <ul className="space-y-2">
          {visits.map((visit) => (
            <li key={visit.id} className="flex items-start justify-between gap-3 rounded-xl bg-white/70 p-3">
              <div className="flex items-center gap-3">
                {visit.photo_url && (
                  <img src={visit.photo_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                )}
                <div>
                  <p className="text-sm text-stone-800">{fmt.dateTime(new Date(visit.dateSeen), { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  {visit.locationSeen && <p className="text-xs text-stone-500">{visit.locationSeen}</p>}
                </div>
              </div>
              {isPlus && (
                <button
                  type="button"
                  onClick={() => handleDelete(visit.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  {t('deleteVisit')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isPlus ? (
        <Button
          variant="outline"
          onClick={() => setModalOpen(true)}
          className="h-9 w-full rounded-full border-black/10 bg-white/70 text-xs text-stone-800 hover:bg-white"
        >
          {t('addVisit')}
        </Button>
      ) : (
        <div className="space-y-2 rounded-xl bg-[#ed694c]/5 p-3">
          <p className="text-sm font-medium text-stone-800">{t('upsellTitle')}</p>
          <p className="text-xs text-stone-600">{t('upsellBody')}</p>
          <Button
            onClick={async () => {
              const res = await fetch('/api/billing/checkout', { method: 'POST' })
              const data = await res.json()
              if (data.url) window.location.href = data.url
            }}
            className="h-9 w-full rounded-full bg-[#ed694c] hover:bg-[#db573c] border-0 text-xs text-white"
          >
            {t('upgradeButton')}
          </Button>
        </div>
      )}

      <VisitModal
        artworkId={artworkId}
        artworkTitle={artworkTitle}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSaved={refresh}
      />
    </div>
  )
}
```

- [ ] **Step 3: Wire `isPlus` through the server component**

In `app/artworks/[id]/page.tsx`, add the import and compute the flag next to the existing `seen` lookup:

```typescript
import { hasActiveEntitlement } from '@/lib/entitlement'
```

Directly after the existing `const seen = session?.user?.id ? ... : null` block, add:

```typescript
  const isPlus = session?.user?.id ? await hasActiveEntitlement(session.user.id) : false
```

And pass it to `ArtworkDetailClient`, adding `isPlus={isPlus}` alongside the existing props in the `return` statement.

- [ ] **Step 4: Accept and forward the prop in the client component**

In `app/artworks/[id]/artwork-detail-client.tsx`:

Add `isPlus: boolean` to the `ArtworkDetailClientProps` interface (after `isLoggedIn: boolean`), and destructure it in the function signature (after `isLoggedIn,`).

Add the import near the top:

```typescript
import VisitHistory from '@/components/visit-history'
```

Render it right after the existing `<SeenModal ... />` block (which is followed by `</div>` closing the component — insert before that closing tag), but only when the user has an existing `Seen` entry for this artwork (matches the spec: visit logging only makes sense once there's at least one "seen" mark):

```tsx
      {seen && (
        <VisitHistory artworkId={artwork.id} artworkTitle={artwork.title} isPlus={isPlus} />
      )}
```

- [ ] **Step 5: Build and typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -v "testing-library\|seen-modal.test.tsx"`
Expected: no output.

Run: `npm run build 2>&1 | tail -20`
Expected: build succeeds, `/api/visits` and `/api/visits/[id]` show up in the route list.

- [ ] **Step 6: Manual browser verification against local dev.db**

`DATABASE_URL="file:./dev.db" npm run dev`, then:
- As a non-Plus logged-in user who has marked an artwork as seen: open that artwork's page, confirm the upsell card appears below the seen status with the correct price copy, and that clicking "Upgrade naar Plus" redirects to a Stripe Checkout page (stop before entering card details — this reuses the already-tested `/api/billing/checkout`, no need to complete a payment here).
- Manually set that user's `Entitlement.active = 1` in `dev.db`, reload the page: confirm the upsell card is replaced by the "Nog een bezoek toevoegen" button, that adding a visit shows up in the list with photo thumbnail and date, and that deleting it removes it from the list.

- [ ] **Step 7: Commit**

```bash
git add components/visit-history.tsx app/artworks/\[id\]/page.tsx app/artworks/\[id\]/artwork-detail-client.tsx messages/nl.json messages/en.json
git commit -m "Wire visit history + Plus upsell into the artwork detail page

This is the app's first real UI entry point to /api/billing/checkout.
Non-Plus users with an existing Seen entry see an upgrade card;
Plus users see their logged visits and can add/remove more."
```

---

## Self-Review Notes

- **Spec coverage:** datamodel (Task 2), API + gating (Tasks 3, 5, 6), photo-first redesign for everyone (Tasks 4, 7, 8), Plus add-visit flow (Task 9), history + upsell entry point (Task 10), edge cases — lapsed subscription keeps history (GET ungated, Task 5), delete-resync (Task 6), compression fallback (Task 4) — all covered. Turso migration script is written (Task 2) but deliberately not run as part of this plan, matching how the billing tables were rolled out — run it manually once this plan is fully reviewed and merged.
- **Type consistency:** `VisitFormFields` props (`date`, `onDateChange`, `locationValue`, `onLocationChange`, `rating`, `onRatingChange`, `notes`, `onNotesChange`, `photoUrl`, `onPhotoUrlChange`) are identical across Task 7's definition and Tasks 8/9's usages. `hasActiveEntitlement(userId: string): Promise<boolean>` signature matches between Task 3's definition and Tasks 5/6/10's call sites.
