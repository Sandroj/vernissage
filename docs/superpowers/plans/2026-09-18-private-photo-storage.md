# Private Photo Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `Seen.photo_url` / `Visit.photo_url` from base64 data-URLs stored
directly in the database to a private Cloudflare R2 bucket, served only via
short-lived signed URLs.

**Architecture:** A new `lib/photo-storage.ts` module wraps R2 upload
(`storePhoto`), signed-URL generation (`signedPhotoUrl`), and DB-aware
orphan-safe deletion (`deletePhotoIfOrphaned`). The existing `POST /api/seen`
and `POST /api/visits` routes call `storePhoto` inline (no new API route) and
store the returned R2 *key* in the same `photo_url` column; every read path
that sends `photo_url` to the browser converts it through `signedPhotoUrl`
first. The "paste a photo URL" input is removed — upload-only from now on.

**Tech Stack:** Next.js App Router (Node runtime), Prisma, `@aws-sdk/client-s3`
(already a dependency), `@aws-sdk/s3-request-presigner` (new), `sharp`
(already a dependency, already used server-side in `app/api/admin/images/route.ts`
with the exact same S3-client pattern this plan reuses).

**Spec:** `docs/superpowers/specs/2026-09-18-private-photo-storage-design.md`

## Global Constraints

- New R2 bucket must have **no public custom domain attached** — this is a
  one-time manual Cloudflare-dashboard step for Sander, not code. Implementation
  can proceed without it existing yet; only live end-to-end verification needs it.
- Reuses existing `R2_ACCOUNT_ID`/`R2_ACCESS_KEY`/`R2_SECRET_KEY` env vars.
  New env var: `R2_PRIVATE_BUCKET` (bucket name only).
- Signed URL TTL: **1 hour** (3600 seconds).
- Server-side max photo size: **15MB** decoded bytes (matches the existing
  client-side `MAX_PHOTO_FILE_SIZE` in `components/visit-form-fields.tsx`).
- Image processing pipeline (exact parameters, matching the existing
  client-side compression in `lib/image-compress.ts`):
  `sharp(bytes, { failOn: 'error' }).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer()`
- Object key shape: `photos/<userId>/<uuid>.jpg`.
- **Backward compatibility, not migration:** any stored `photo_url` value
  that starts with `data:` is passed through unchanged by every function in
  `lib/photo-storage.ts` (treated as "nothing to sign, nothing to delete").
  The 5 existing test rows in production are deliberately never migrated —
  explicit product decision, confirmed by the user. This passthrough is
  permanent code, not a transitional shim to clean up later.
- The "paste a photo URL" input is removed entirely from
  `components/visit-form-fields.tsx` — upload-only from now on. Any
  non-`data:`, non-null `photo_url` value reaching an API route is now
  unexpected input and rejected with 400.
- No new API route. Photo upload rides inside the existing `POST /api/seen`
  and `POST /api/visits` JSON request bodies, exact same shape as today.
- No orphan-sweeping cron job. No migration script. No per-user quota. (All
  explicit non-goals in the spec.)

---

### Task 1: `lib/photo-storage.ts` — core R2 functions + setup

**Files:**
- Modify: `package.json` (add dependency)
- Modify: `.env.example` (document new env var)
- Create: `lib/photo-storage.ts`
- Test: `__tests__/lib/photo-storage.test.ts`

**Interfaces:**
- Produces: `storePhoto(userId: string, dataUrl: string): Promise<string>` —
  returns an R2 object key. Throws `Error` if the decoded payload is empty,
  exceeds 15MB, or `sharp` fails to decode it.
- Produces: `signedPhotoUrl(key: string): Promise<string>` — returns a
  presigned GET URL (1-hour expiry), or `key` unchanged if it starts with
  `data:`.
- Produces: `deletePhoto(key: string): Promise<void>` — deletes the R2
  object, or no-ops if `key` starts with `data:`. Swallows any R2 delete
  error internally (best-effort cleanup, never throws).

- [ ] **Step 1: Add the new dependency**

```bash
npm install @aws-sdk/s3-request-presigner
```

- [ ] **Step 2: Document the new env var**

Add to `.env.example`, directly after the existing `R2_PUBLIC_URL` line:

```
R2_PRIVATE_BUCKET="arttracker-private"   # separate bucket, NO public custom domain attached
```

- [ ] **Step 3: Write the failing tests**

Create `__tests__/lib/photo-storage.test.ts`:

```ts
/**
 * @jest-environment node
 */
const mockSend = jest.fn()
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn((input) => ({ input })),
  DeleteObjectCommand: jest.fn((input) => ({ input })),
  GetObjectCommand: jest.fn((input) => ({ input })),
}))
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://signed.example/photo.jpg'),
}))
const mockToBuffer = jest.fn().mockResolvedValue(Buffer.from('optimized-bytes'))
jest.mock('sharp', () => jest.fn(() => ({
  rotate: jest.fn().mockReturnThis(),
  resize: jest.fn().mockReturnThis(),
  jpeg: jest.fn().mockReturnThis(),
  toBuffer: mockToBuffer,
})))

import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import sharp from 'sharp'
import { storePhoto, signedPhotoUrl, deletePhoto } from '@/lib/photo-storage'

const ORIGINAL_ENV = process.env

beforeEach(() => {
  jest.clearAllMocks()
  process.env = {
    ...ORIGINAL_ENV,
    R2_ACCOUNT_ID: 'acc',
    R2_ACCESS_KEY: 'key',
    R2_SECRET_KEY: 'secret',
    R2_PRIVATE_BUCKET: 'private-bucket',
  }
})
afterAll(() => { process.env = ORIGINAL_ENV })

describe('storePhoto', () => {
  it('uploads a decoded data-URL and returns a photos/<userId>/<uuid>.jpg key', async () => {
    mockSend.mockResolvedValue({})
    const key = await storePhoto('user-1', 'data:image/jpeg;base64,aGVsbG8=')
    expect(key).toMatch(/^photos\/user-1\/[0-9a-f-]+\.jpg$/)
    expect(sharp).toHaveBeenCalled()
    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  it('rejects a payload over 15MB without calling sharp or uploading', async () => {
    const big = 'data:image/jpeg;base64,' + Buffer.alloc(16 * 1024 * 1024).toString('base64')
    await expect(storePhoto('user-1', big)).rejects.toThrow()
    expect(sharp).not.toHaveBeenCalled()
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('rejects an empty/undecodable payload', async () => {
    await expect(storePhoto('user-1', 'data:image/jpeg;base64,')).rejects.toThrow()
  })
})

describe('signedPhotoUrl', () => {
  it('returns a presigned URL for a real key', async () => {
    const url = await signedPhotoUrl('photos/user-1/abc.jpg')
    expect(url).toBe('https://signed.example/photo.jpg')
    expect(getSignedUrl).toHaveBeenCalledTimes(1)
  })

  it('passes a legacy data: value through unchanged, no signing attempted', async () => {
    const legacy = 'data:image/jpeg;base64,aGVsbG8='
    const url = await signedPhotoUrl(legacy)
    expect(url).toBe(legacy)
    expect(getSignedUrl).not.toHaveBeenCalled()
  })
})

describe('deletePhoto', () => {
  it('deletes a real key', async () => {
    mockSend.mockResolvedValue({})
    await deletePhoto('photos/user-1/abc.jpg')
    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  it('no-ops for a legacy data: value', async () => {
    await deletePhoto('data:image/jpeg;base64,aGVsbG8=')
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('swallows an R2 delete failure instead of throwing', async () => {
    mockSend.mockRejectedValue(new Error('network down'))
    await expect(deletePhoto('photos/user-1/abc.jpg')).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx jest __tests__/lib/photo-storage.test.ts`
Expected: FAIL — `Cannot find module '@/lib/photo-storage'`

- [ ] **Step 5: Implement `lib/photo-storage.ts`**

```ts
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'
import sharp from 'sharp'

const MAX_PHOTO_BYTES = 15 * 1024 * 1024
const SIGNED_URL_TTL_SECONDS = 60 * 60

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is niet geconfigureerd`)
  return value
}

function client(): S3Client {
  const accountId = requiredEnv('R2_ACCOUNT_ID')
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requiredEnv('R2_ACCESS_KEY'),
      secretAccessKey: requiredEnv('R2_SECRET_KEY'),
    },
  })
}

function bucket(): string {
  return requiredEnv('R2_PRIVATE_BUCKET')
}

export async function storePhoto(userId: string, dataUrl: string): Promise<string> {
  const base64 = dataUrl.split(',')[1] ?? ''
  const bytes = Buffer.from(base64, 'base64')
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_PHOTO_BYTES) {
    throw new Error('Foto is te groot of ongeldig')
  }
  const optimized = await sharp(bytes, { failOn: 'error' })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer()
  const key = `photos/${userId}/${randomUUID()}.jpg`
  await client().send(new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    Body: optimized,
    ContentType: 'image/jpeg',
  }))
  return key
}

export async function signedPhotoUrl(key: string): Promise<string> {
  if (key.startsWith('data:')) return key
  return getSignedUrl(client(), new GetObjectCommand({ Bucket: bucket(), Key: key }), {
    expiresIn: SIGNED_URL_TTL_SECONDS,
  })
}

export async function deletePhoto(key: string): Promise<void> {
  if (key.startsWith('data:')) return
  await client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key })).catch(() => {})
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx jest __tests__/lib/photo-storage.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .env.example lib/photo-storage.ts __tests__/lib/photo-storage.test.ts
git commit -m "Add private R2 photo storage: upload, signed-URL read, delete"
```

---

### Task 2: `deletePhotoIfOrphaned` — DB-aware safe cleanup

**Why this exists:** `Seen.photo_url` and `Visit.photo_url` can independently
reference the *same* R2 key (`Seen` is a synced cache of the newest `Visit`).
Before deleting an R2 object because one row stopped pointing at it, this
checks that no *other* `Seen`/`Visit` row for the same user+artwork still
points at that exact key — otherwise deleting it would break a photo that's
still displayed elsewhere. This is the one function in this plan that talks
to Prisma directly (matching the precedent in `lib/entitlement.ts`, which
also imports `@/lib/prisma` directly and is tested by mocking it).

**Files:**
- Modify: `lib/photo-storage.ts`
- Modify: `__tests__/lib/photo-storage.test.ts`

**Interfaces:**
- Consumes: `deletePhoto(key: string): Promise<void>` from Task 1.
- Produces: `deletePhotoIfOrphaned(userId: string, artworkId: number, key: string): Promise<void>` —
  looks up whether `Seen` or `Visit` (for that user+artwork) still holds
  `key`; if neither does, calls `deletePhoto(key)`. No-ops for a `data:`
  value (delegates the check to `deletePhoto`'s own guard, but skips the two
  DB queries entirely in that case since there's nothing to look up).

- [ ] **Step 1: Write the failing tests**

Add to `__tests__/lib/photo-storage.test.ts` (new top-level mock + describe
block — add the `jest.mock('@/lib/prisma', ...)` call alongside the existing
mocks at the top of the file, and the import alongside the existing imports):

```ts
jest.mock('@/lib/prisma', () => ({
  prisma: {
    seen: { findFirst: jest.fn() },
    visit: { findFirst: jest.fn() },
  },
}))
```

```ts
import { prisma } from '@/lib/prisma'
import { deletePhotoIfOrphaned } from '@/lib/photo-storage'
```

```ts
describe('deletePhotoIfOrphaned', () => {
  it('deletes the key when neither Seen nor Visit reference it', async () => {
    mockSend.mockResolvedValue({})
    ;(prisma.seen.findFirst as jest.Mock).mockResolvedValue(null)
    ;(prisma.visit.findFirst as jest.Mock).mockResolvedValue(null)

    await deletePhotoIfOrphaned('user-1', 42, 'photos/user-1/abc.jpg')

    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  it('does not delete when Seen still references the key', async () => {
    ;(prisma.seen.findFirst as jest.Mock).mockResolvedValue({ id: 1 })
    ;(prisma.visit.findFirst as jest.Mock).mockResolvedValue(null)

    await deletePhotoIfOrphaned('user-1', 42, 'photos/user-1/abc.jpg')

    expect(mockSend).not.toHaveBeenCalled()
  })

  it('does not delete when another Visit still references the key', async () => {
    ;(prisma.seen.findFirst as jest.Mock).mockResolvedValue(null)
    ;(prisma.visit.findFirst as jest.Mock).mockResolvedValue({ id: 7 })

    await deletePhotoIfOrphaned('user-1', 42, 'photos/user-1/abc.jpg')

    expect(mockSend).not.toHaveBeenCalled()
  })

  it('skips both DB lookups for a legacy data: value', async () => {
    await deletePhotoIfOrphaned('user-1', 42, 'data:image/jpeg;base64,aGVsbG8=')

    expect(prisma.seen.findFirst).not.toHaveBeenCalled()
    expect(prisma.visit.findFirst).not.toHaveBeenCalled()
    expect(mockSend).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/lib/photo-storage.test.ts`
Expected: FAIL — `deletePhotoIfOrphaned is not a function`

- [ ] **Step 3: Implement `deletePhotoIfOrphaned`**

Add to `lib/photo-storage.ts` (new import line at the top, new function at
the bottom):

```ts
import { prisma } from '@/lib/prisma'
```

```ts
export async function deletePhotoIfOrphaned(userId: string, artworkId: number, key: string): Promise<void> {
  if (key.startsWith('data:')) return
  const [seenMatch, visitMatch] = await Promise.all([
    prisma.seen.findFirst({ where: { userId, artworkId, photo_url: key }, select: { id: true } }),
    prisma.visit.findFirst({ where: { userId, artworkId, photo_url: key }, select: { id: true } }),
  ])
  if (!seenMatch && !visitMatch) await deletePhoto(key)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/lib/photo-storage.test.ts`
Expected: PASS (13 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/photo-storage.ts __tests__/lib/photo-storage.test.ts
git commit -m "Add deletePhotoIfOrphaned: safe cleanup shared between Seen and Visit"
```

---

### Task 3: `app/api/seen/route.ts` — upload on write, sign on read, cleanup

**Files:**
- Modify: `app/api/seen/route.ts`
- Create: `__tests__/api/seen.test.ts`

**Interfaces:**
- Consumes: `storePhoto`, `signedPhotoUrl`, `deletePhotoIfOrphaned` from `@/lib/photo-storage` (Tasks 1–2).
- Produces: no change to the route's external HTTP contract (same request/response shapes), except `photo_url` in GET responses is now a signed URL instead of a raw data-URL, and POST now returns 400 for a non-`data:`, non-null `photo_url`.

Current file (for reference — full contents before this task):

```ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { artworkId, dateSeen, locationSeen, notes, rating, photo_url } = await req.json()

  const seen = await prisma.seen.upsert({
    where: { userId_artworkId: { userId: session.user.id, artworkId } },
    update: { dateSeen: new Date(dateSeen), locationSeen, notes, rating, photo_url },
    create: {
      userId: session.user.id,
      artworkId,
      dateSeen: new Date(dateSeen),
      locationSeen,
      notes,
      rating,
      photo_url,
    },
  })

  return NextResponse.json(seen, { status: 201 })
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { artworkId } = await req.json()
  const parsedArtworkId = Number(artworkId)
  if (!Number.isInteger(parsedArtworkId) || parsedArtworkId <= 0) {
    return NextResponse.json({ error: 'Ongeldig werk' }, { status: 400 })
  }

  await prisma.seen.deleteMany({
    where: { userId: session.user.id, artworkId: parsedArtworkId },
  })

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const seen = await prisma.seen.findMany({
    where: { userId: session.user.id },
    include: { artwork: { include: { artist: true, museum: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(seen)
}
```

**Why POST needs a "was `photo_url` even present in the request" check
(`photoTouched`), not just "is it truthy":** the client only sends a real
`data:` value when the user picks a new photo, and `null` when they remove
one. If the client omits the field entirely (editing date/notes/rating
without touching the photo — this is wired up in Task 7), the route must
leave the existing photo alone. Checking `'photo_url' in body` (not just
truthiness) is what makes "omitted" distinguishable from "explicitly
cleared". `JSON.parse` correctly preserves this distinction: a key that was
never included in the `JSON.stringify`d object on the client is absent from
the parsed object on the server.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/api/seen.test.ts`:

```ts
/**
 * @jest-environment node
 */
jest.mock('@/lib/prisma', () => ({
  prisma: {
    seen: { upsert: jest.fn(), deleteMany: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
  },
}))
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/photo-storage', () => ({
  storePhoto: jest.fn(),
  signedPhotoUrl: jest.fn((key: string) => Promise.resolve(key)),
  deletePhotoIfOrphaned: jest.fn(),
}))

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { storePhoto, signedPhotoUrl, deletePhotoIfOrphaned } from '@/lib/photo-storage'
import { POST, DELETE, GET } from '@/app/api/seen/route'

const session = { user: { id: 'user-1' } }

function postRequest(body: object) {
  return new Request('http://localhost/api/seen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
function deleteRequest(body: object) {
  return new Request('http://localhost/api/seen', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/seen', () => {
  afterEach(() => jest.clearAllMocks())

  it('leaves photo_url untouched when the field is omitted from the body', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(prisma.seen.upsert as jest.Mock).mockResolvedValue({ id: 1 })

    const res = await POST(postRequest({ artworkId: 1, dateSeen: '2026-01-01T00:00:00Z', locationSeen: null, notes: null, rating: null }))

    expect(res.status).toBe(201)
    expect(storePhoto).not.toHaveBeenCalled()
    expect(prisma.seen.findUnique).not.toHaveBeenCalled()
    const upsertArgs = (prisma.seen.upsert as jest.Mock).mock.calls[0][0]
    expect(upsertArgs.update).not.toHaveProperty('photo_url')
    expect(upsertArgs.create).not.toHaveProperty('photo_url')
  })

  it('uploads a data: photo_url and stores the returned key', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(prisma.seen.findUnique as jest.Mock).mockResolvedValue(null)
    ;(storePhoto as jest.Mock).mockResolvedValue('photos/user-1/new.jpg')
    ;(prisma.seen.upsert as jest.Mock).mockResolvedValue({ id: 1 })

    const res = await POST(postRequest({ artworkId: 1, dateSeen: '2026-01-01T00:00:00Z', photo_url: 'data:image/jpeg;base64,aGVsbG8=' }))

    expect(res.status).toBe(201)
    expect(storePhoto).toHaveBeenCalledWith('user-1', 'data:image/jpeg;base64,aGVsbG8=')
    const upsertArgs = (prisma.seen.upsert as jest.Mock).mock.calls[0][0]
    expect(upsertArgs.update.photo_url).toBe('photos/user-1/new.jpg')
  })

  it('rejects a non-data:, non-null photo_url with 400', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)

    const res = await POST(postRequest({ artworkId: 1, dateSeen: '2026-01-01T00:00:00Z', photo_url: 'https://evil.example/x.jpg' }))

    expect(res.status).toBe(400)
    expect(storePhoto).not.toHaveBeenCalled()
  })

  it('cleans up the old photo when it is replaced by a new one', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(prisma.seen.findUnique as jest.Mock).mockResolvedValue({ photo_url: 'photos/user-1/old.jpg' })
    ;(storePhoto as jest.Mock).mockResolvedValue('photos/user-1/new.jpg')
    ;(prisma.seen.upsert as jest.Mock).mockResolvedValue({ id: 1 })

    await POST(postRequest({ artworkId: 1, dateSeen: '2026-01-01T00:00:00Z', photo_url: 'data:image/jpeg;base64,aGVsbG8=' }))

    expect(deletePhotoIfOrphaned).toHaveBeenCalledWith('user-1', 1, 'photos/user-1/old.jpg')
  })

  it('does not attempt cleanup when the photo did not change', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(prisma.seen.findUnique as jest.Mock).mockResolvedValue({ photo_url: null })
    ;(prisma.seen.upsert as jest.Mock).mockResolvedValue({ id: 1 })

    await POST(postRequest({ artworkId: 1, dateSeen: '2026-01-01T00:00:00Z', photo_url: null }))

    expect(deletePhotoIfOrphaned).not.toHaveBeenCalled()
  })

  it('returns 400 when storePhoto rejects the payload', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(prisma.seen.findUnique as jest.Mock).mockResolvedValue(null)
    ;(storePhoto as jest.Mock).mockRejectedValue(new Error('too big'))

    const res = await POST(postRequest({ artworkId: 1, dateSeen: '2026-01-01T00:00:00Z', photo_url: 'data:image/jpeg;base64,aGVsbG8=' }))

    expect(res.status).toBe(400)
    expect(prisma.seen.upsert).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/seen', () => {
  afterEach(() => jest.clearAllMocks())

  it('cleans up the photo after deleting the row', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(prisma.seen.findUnique as jest.Mock).mockResolvedValue({ photo_url: 'photos/user-1/gone.jpg' })
    ;(prisma.seen.deleteMany as jest.Mock).mockResolvedValue({ count: 1 })

    const res = await DELETE(deleteRequest({ artworkId: 1 }))

    expect(res.status).toBe(200)
    expect(deletePhotoIfOrphaned).toHaveBeenCalledWith('user-1', 1, 'photos/user-1/gone.jpg')
  })

  it('skips cleanup when there was no photo', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(prisma.seen.findUnique as jest.Mock).mockResolvedValue({ photo_url: null })
    ;(prisma.seen.deleteMany as jest.Mock).mockResolvedValue({ count: 1 })

    await DELETE(deleteRequest({ artworkId: 1 }))

    expect(deletePhotoIfOrphaned).not.toHaveBeenCalled()
  })
})

describe('GET /api/seen', () => {
  afterEach(() => jest.clearAllMocks())

  it('signs each row\'s photo_url before returning', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(prisma.seen.findMany as jest.Mock).mockResolvedValue([
      { id: 1, artworkId: 1, photo_url: 'photos/user-1/a.jpg' },
      { id: 2, artworkId: 2, photo_url: null },
    ])
    ;(signedPhotoUrl as jest.Mock).mockResolvedValue('https://signed.example/a.jpg')

    const res = await GET()
    const body = await res.json()

    expect(signedPhotoUrl).toHaveBeenCalledWith('photos/user-1/a.jpg')
    expect(body[0].photo_url).toBe('https://signed.example/a.jpg')
    expect(body[1].photo_url).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/api/seen.test.ts`
Expected: FAIL (route doesn't yet check `photoTouched`, doesn't call
`storePhoto`/`signedPhotoUrl`/`deletePhotoIfOrphaned`)

- [ ] **Step 3: Implement the route**

Replace the full contents of `app/api/seen/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { storePhoto, signedPhotoUrl, deletePhotoIfOrphaned } from '@/lib/photo-storage'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const body = await req.json()
  const { artworkId, dateSeen, locationSeen, notes, rating } = body
  const userId = session.user.id
  const photoTouched = 'photo_url' in body

  if (photoTouched) {
    const incoming = body.photo_url as string | null
    if (incoming && !incoming.startsWith('data:')) {
      return NextResponse.json({ error: 'Ongeldige foto' }, { status: 400 })
    }
  }

  const existing = photoTouched
    ? await prisma.seen.findUnique({ where: { userId_artworkId: { userId, artworkId } }, select: { photo_url: true } })
    : null

  let storedKey: string | null = null
  if (photoTouched && body.photo_url) {
    try {
      storedKey = await storePhoto(userId, body.photo_url)
    } catch {
      return NextResponse.json({ error: 'Kon de foto niet opslaan' }, { status: 400 })
    }
  }

  const photoField = photoTouched ? { photo_url: storedKey } : {}

  const seen = await prisma.seen.upsert({
    where: { userId_artworkId: { userId, artworkId } },
    update: { dateSeen: new Date(dateSeen), locationSeen, notes, rating, ...photoField },
    create: { userId, artworkId, dateSeen: new Date(dateSeen), locationSeen, notes, rating, ...photoField },
  })

  if (photoTouched && existing?.photo_url && existing.photo_url !== storedKey) {
    await deletePhotoIfOrphaned(userId, artworkId, existing.photo_url)
  }

  return NextResponse.json(seen, { status: 201 })
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { artworkId } = await req.json()
  const parsedArtworkId = Number(artworkId)
  if (!Number.isInteger(parsedArtworkId) || parsedArtworkId <= 0) {
    return NextResponse.json({ error: 'Ongeldig werk' }, { status: 400 })
  }

  const userId = session.user.id
  const existing = await prisma.seen.findUnique({
    where: { userId_artworkId: { userId, artworkId: parsedArtworkId } },
    select: { photo_url: true },
  })

  await prisma.seen.deleteMany({
    where: { userId, artworkId: parsedArtworkId },
  })

  if (existing?.photo_url) {
    await deletePhotoIfOrphaned(userId, parsedArtworkId, existing.photo_url)
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const seen = await prisma.seen.findMany({
    where: { userId: session.user.id },
    include: { artwork: { include: { artist: true, museum: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const signed = await Promise.all(seen.map(async (row) => ({
    ...row,
    photo_url: row.photo_url ? await signedPhotoUrl(row.photo_url) : row.photo_url,
  })))

  return NextResponse.json(signed)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/api/seen.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Run the full suite to check nothing else broke**

Run: `npx jest`
Expected: PASS, same suite count as before plus these new tests.

- [ ] **Step 6: Commit**

```bash
git add app/api/seen/route.ts __tests__/api/seen.test.ts
git commit -m "Wire private photo storage into POST/DELETE/GET /api/seen"
```

---

### Task 4: `app/api/visits/route.ts` — upload on write, sign on read

**Files:**
- Modify: `app/api/visits/route.ts`
- Modify: `__tests__/api/visits.test.ts`

**Interfaces:**
- Consumes: `storePhoto`, `signedPhotoUrl`, `deletePhotoIfOrphaned` from `@/lib/photo-storage`.
- Produces: no change to the route's external contract, except `photo_url`
  in the GET response is now a signed URL, and POST now returns 400 for a
  non-`data:`, non-null `photo_url`.

**Note on existing tests:** the two current tests in `__tests__/api/visits.test.ts`
never set `photo_url` in their request bodies, so they exercise none of the
new code paths below and should keep passing unmodified once the new mocks
are added (mocking a module that a passing test never calls doesn't change
its behavior).

- [ ] **Step 1: Add the photo-storage mock and update the prisma mock**

In `__tests__/api/visits.test.ts`, replace the top-of-file mocks:

```ts
jest.mock('@/lib/prisma', () => ({
  prisma: {
    visit: { create: jest.fn(), delete: jest.fn(), findFirst: jest.fn() },
    seen: { upsert: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
  },
}))
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/entitlement', () => ({ hasActiveEntitlement: jest.fn() }))
// deletePhotoIfOrphaned is mocked as a whole below, so its real internals
// (which call prisma.seen.findFirst) never execute in this file — no need
// to add that method to the prisma mock above.
jest.mock('@/lib/photo-storage', () => ({
  storePhoto: jest.fn(),
  signedPhotoUrl: jest.fn((key: string) => Promise.resolve(key)),
  deletePhotoIfOrphaned: jest.fn(),
}))
```

Add to the imports block:

```ts
import { storePhoto, signedPhotoUrl, deletePhotoIfOrphaned } from '@/lib/photo-storage'
```

Add near the top, alongside `postRequest`:

```ts
function getRequest(artworkId: number) {
  return new Request(`http://localhost/api/visits?artworkId=${artworkId}`)
}
```

- [ ] **Step 2: Write the new failing tests**

Add inside `describe('POST /api/visits', ...)`, after the existing two tests:

```ts
  it('uploads a data: photo_url and stores the returned key', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(hasActiveEntitlement as jest.Mock).mockResolvedValue(true)
    ;(prisma.seen.findUnique as jest.Mock).mockResolvedValue(null)
    ;(storePhoto as jest.Mock).mockResolvedValue('photos/user-1/new.jpg')
    const visit = { id: 11, userId: 'user-1', artworkId: 1, dateSeen: new Date('2026-01-01T00:00:00Z'), locationSeen: null, notes: null, rating: null, photo_url: 'photos/user-1/new.jpg' }
    ;(prisma.visit.create as jest.Mock).mockResolvedValue(visit)
    ;(prisma.seen.upsert as jest.Mock).mockResolvedValue({})

    const res = await POST(postRequest({ artworkId: 1, dateSeen: '2026-01-01T00:00:00Z', photo_url: 'data:image/jpeg;base64,aGVsbG8=' }))

    expect(res.status).toBe(201)
    expect(storePhoto).toHaveBeenCalledWith('user-1', 'data:image/jpeg;base64,aGVsbG8=')
    const createArgs = (prisma.visit.create as jest.Mock).mock.calls[0][0]
    expect(createArgs.data.photo_url).toBe('photos/user-1/new.jpg')
  })

  it('rejects a non-data:, non-null photo_url with 400', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(hasActiveEntitlement as jest.Mock).mockResolvedValue(true)

    const res = await POST(postRequest({ artworkId: 1, dateSeen: '2026-01-01T00:00:00Z', photo_url: 'https://evil.example/x.jpg' }))

    expect(res.status).toBe(400)
    expect(prisma.visit.create).not.toHaveBeenCalled()
  })

  it('cleans up a photo that was on Seen but is being overwritten by this visit', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(hasActiveEntitlement as jest.Mock).mockResolvedValue(true)
    ;(prisma.seen.findUnique as jest.Mock).mockResolvedValue({ photo_url: 'photos/user-1/old-seen.jpg' })
    ;(storePhoto as jest.Mock).mockResolvedValue('photos/user-1/new.jpg')
    const visit = { id: 11, userId: 'user-1', artworkId: 1, dateSeen: new Date('2026-01-01T00:00:00Z'), locationSeen: null, notes: null, rating: null, photo_url: 'photos/user-1/new.jpg' }
    ;(prisma.visit.create as jest.Mock).mockResolvedValue(visit)
    ;(prisma.seen.upsert as jest.Mock).mockResolvedValue({})

    await POST(postRequest({ artworkId: 1, dateSeen: '2026-01-01T00:00:00Z', photo_url: 'data:image/jpeg;base64,aGVsbG8=' }))

    expect(deletePhotoIfOrphaned).toHaveBeenCalledWith('user-1', 1, 'photos/user-1/old-seen.jpg')
  })
```

Add a new top-level describe block for GET, after the existing `describe('DELETE /api/visits/[id]', ...)` block:

```ts
describe('GET /api/visits', () => {
  afterEach(() => jest.clearAllMocks())

  it('signs each visit\'s photo_url before returning', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(prisma.visit.findFirst as jest.Mock) // unused here, present only so the mock object shape matches
    const { GET } = await import('@/app/api/visits/route')
    ;(require('@/lib/prisma').prisma as any).visit.findMany = jest.fn().mockResolvedValue([
      { id: 1, dateSeen: new Date(), locationSeen: null, photo_url: 'photos/user-1/a.jpg' },
    ])
    ;(signedPhotoUrl as jest.Mock).mockResolvedValue('https://signed.example/a.jpg')

    const res = await GET(getRequest(1))
    const body = await res.json()

    expect(signedPhotoUrl).toHaveBeenCalledWith('photos/user-1/a.jpg')
    expect(body[0].photo_url).toBe('https://signed.example/a.jpg')
  })
})
```

*(Note: the DELETE route's cleanup behavior is Task 5's responsibility —
its test is written and verified there, not here, so this task's own test
run below is fully green on its own.)*

*(Note on the GET test above: `prisma.visit.findMany` was never part of the
original mock object at the top of the file, since GET wasn't tested before
this task — the `require(...)`-based patch keeps this task's diff additive
without having to touch the shared top-of-file mock shape. This is a
deliberate small wart, not an oversight: adding `findMany: jest.fn()` to the
shared mock object at the top would be equally valid and slightly cleaner —
either is acceptable, the implementer's choice.)*

- [ ] **Step 3: Run tests to verify the new ones fail**

Run: `npx jest __tests__/api/visits.test.ts`
Expected: the 4 new tests FAIL; the 4 original tests still PASS.

- [ ] **Step 4: Implement the route**

Replace the full contents of `app/api/visits/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasActiveEntitlement } from '@/lib/entitlement'
import { storePhoto, signedPhotoUrl, deletePhotoIfOrphaned } from '@/lib/photo-storage'

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

  if (photo_url && !photo_url.startsWith('data:')) {
    return NextResponse.json({ error: 'Ongeldige foto' }, { status: 400 })
  }

  const existingSeen = await prisma.seen.findUnique({
    where: { userId_artworkId: { userId, artworkId } },
    select: { photo_url: true },
  })

  let storedKey: string | null = null
  if (photo_url) {
    try {
      storedKey = await storePhoto(userId, photo_url)
    } catch {
      return NextResponse.json({ error: 'Kon de foto niet opslaan' }, { status: 400 })
    }
  }

  const visit = await prisma.visit.create({
    data: {
      userId,
      artworkId,
      dateSeen: new Date(dateSeen),
      locationSeen: locationSeen || null,
      notes: notes || null,
      rating: rating ?? null,
      photo_url: storedKey,
    },
  })

  // Best-effort synced cache: a direct edit via POST /api/seen after this
  // can still overwrite these fields later. No reconciliation between the
  // two paths exists yet (accepted limitation, see plan review Finding F).
  await prisma.seen.upsert({
    where: { userId_artworkId: { userId, artworkId } },
    update: { dateSeen: visit.dateSeen, locationSeen: visit.locationSeen, notes: visit.notes, rating: visit.rating, photo_url: visit.photo_url },
    create: { userId, artworkId, dateSeen: visit.dateSeen, locationSeen: visit.locationSeen, notes: visit.notes, rating: visit.rating, photo_url: visit.photo_url },
  })

  if (existingSeen?.photo_url && existingSeen.photo_url !== visit.photo_url) {
    await deletePhotoIfOrphaned(userId, artworkId, existingSeen.photo_url)
  }

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
    select: { id: true, dateSeen: true, locationSeen: true, photo_url: true },
  })

  const signed = await Promise.all(visits.map(async (v) => ({
    ...v,
    photo_url: v.photo_url ? await signedPhotoUrl(v.photo_url) : v.photo_url,
  })))

  return NextResponse.json(signed)
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest __tests__/api/visits.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 6: Commit**

```bash
git add app/api/visits/route.ts __tests__/api/visits.test.ts
git commit -m "Wire private photo storage into POST/GET /api/visits"
```

---

### Task 5: `app/api/visits/[id]/route.ts` — cleanup on delete

**Files:**
- Modify: `app/api/visits/[id]/route.ts`
- Modify: `__tests__/api/visits.test.ts`

**Interfaces:**
- Consumes: `deletePhotoIfOrphaned` from `@/lib/photo-storage` (already
  imported and mocked at the top of `__tests__/api/visits.test.ts` by
  Task 4 — nothing to add there).

**Ordering matters:** the orphan check must run *after* both the visit
delete and the Seen resync have already happened, so it sees the
already-updated state of both tables — see the spec's "Read paths" section
for why (Seen may or may not still hold the same key, depending on whether
any visits remain).

- [ ] **Step 1: Write the failing test**

Add to `describe('DELETE /api/visits/[id]', ...)` in
`__tests__/api/visits.test.ts`, after the existing two tests:

```ts
  it('cleans up the deleted visit\'s photo when nothing else references it', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(session)
    ;(hasActiveEntitlement as jest.Mock).mockResolvedValue(true)
    ;(prisma.visit.delete as jest.Mock).mockResolvedValue({ id: 10, artworkId: 1, userId: 'user-1', photo_url: 'photos/user-1/deleted.jpg' })
    ;(prisma.visit.findFirst as jest.Mock).mockResolvedValue(null)

    await DELETE(new Request('http://localhost/api/visits/10', { method: 'DELETE' }), { params: { id: '10' } })

    expect(deletePhotoIfOrphaned).toHaveBeenCalledWith('user-1', 1, 'photos/user-1/deleted.jpg')
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/api/visits.test.ts -t "cleans up the deleted visit"`
Expected: FAIL — `deletePhotoIfOrphaned` not called (route doesn't call it yet).

- [ ] **Step 3: Implement the route**

Replace the full contents of `app/api/visits/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasActiveEntitlement } from '@/lib/entitlement'
import { deletePhotoIfOrphaned } from '@/lib/photo-storage'

// DELETE /api/visits/[id] — Plus-only. Removes a visit and resyncs the
// existing Seen row (read by 11 other places in the app) to the
// next-most-recent remaining visit. If none remain, Seen is left untouched.
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
    // Best-effort synced cache: a direct edit via POST /api/seen can still
    // overwrite these fields later. No reconciliation between the two paths
    // exists yet (accepted limitation, see plan review Finding F).
    await prisma.seen.update({
      where: { userId_artworkId: { userId, artworkId: deleted.artworkId } },
      data: { dateSeen: latest.dateSeen, locationSeen: latest.locationSeen, notes: latest.notes, rating: latest.rating, photo_url: latest.photo_url },
    }).catch(() => {}) // no Seen row to update — fine, nothing to sync
  }
  // No visits left: Seen stays exactly as it was, per the spec's edge cases.

  // Runs after the delete and the (possible) Seen resync above, so it sees
  // current state: if Seen was resynced away from this key, or no other
  // visit shares it, it's genuinely orphaned now. If no visits remained and
  // Seen still holds this exact key (the untouched-Seen case just above),
  // the lookup inside deletePhotoIfOrphaned finds that and skips deletion.
  if (deleted.photo_url) {
    await deletePhotoIfOrphaned(userId, deleted.artworkId, deleted.photo_url)
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Run the full visits test file**

Run: `npx jest __tests__/api/visits.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Run the full suite**

Run: `npx jest`
Expected: PASS, no regressions.

- [ ] **Step 6: Commit**

```bash
git add app/api/visits/[id]/route.ts __tests__/api/visits.test.ts
git commit -m "Clean up orphaned R2 photo when a visit is deleted"
```

---

### Task 6: Sign photos in server-rendered props

**Files:**
- Modify: `app/artworks/[id]/page.tsx`
- Modify: `app/profile/page.tsx`

**Interfaces:**
- Consumes: `signedPhotoUrl` from `@/lib/photo-storage`.

**No automated test for this task:** this codebase has no existing test
harness for `page.tsx` Server Components (none of the other `page.tsx`
files under `app/` have a corresponding test), so this task is verified
manually per Step 3 below, consistent with the rest of the codebase.

- [ ] **Step 1: Update `app/artworks/[id]/page.tsx`**

Add the import:

```ts
import { signedPhotoUrl } from '@/lib/photo-storage'
```

Replace the `seen` block:

```ts
  const seen = session?.user?.id
    ? await prisma.seen.findUnique({
        where: { userId_artworkId: { userId: session.user.id, artworkId: artwork.id } },
      })
    : null
```

with:

```ts
  const seenRow = session?.user?.id
    ? await prisma.seen.findUnique({
        where: { userId_artworkId: { userId: session.user.id, artworkId: artwork.id } },
      })
    : null

  const seen = seenRow
    ? { ...seenRow, photo_url: seenRow.photo_url ? await signedPhotoUrl(seenRow.photo_url) : seenRow.photo_url }
    : seenRow
```

- [ ] **Step 2: Update `app/profile/page.tsx`**

Add the import:

```ts
import { signedPhotoUrl } from '@/lib/photo-storage'
```

Replace the `myPhotos` construction (the block starting with `const
visitPhotoUrls = ...` and ending with `.slice(0, 60)`):

```ts
  const visitPhotoUrls = new Set(visitPhotos.map((v) => v.photo_url))
  const myPhotos = [
    ...visitPhotos.map((v) => ({ id: `visit-${v.id}`, dateSeen: v.dateSeen, photo_url: v.photo_url!, artwork: v.artwork })),
    ...seenPhotos.filter((s) => !visitPhotoUrls.has(s.photo_url)).map((s) => ({ id: `seen-${s.id}`, dateSeen: s.dateSeen, photo_url: s.photo_url!, artwork: s.artwork })),
  ]
    .sort((a, b) => +new Date(b.dateSeen) - +new Date(a.dateSeen))
    .slice(0, 60)
```

with:

```ts
  const visitPhotoUrls = new Set(visitPhotos.map((v) => v.photo_url))
  const myPhotosUnsigned = [
    ...visitPhotos.map((v) => ({ id: `visit-${v.id}`, dateSeen: v.dateSeen, photo_url: v.photo_url!, artwork: v.artwork })),
    ...seenPhotos.filter((s) => !visitPhotoUrls.has(s.photo_url)).map((s) => ({ id: `seen-${s.id}`, dateSeen: s.dateSeen, photo_url: s.photo_url!, artwork: s.artwork })),
  ]
    .sort((a, b) => +new Date(b.dateSeen) - +new Date(a.dateSeen))
    .slice(0, 60)

  const myPhotos = await Promise.all(
    myPhotosUnsigned.map(async (photo) => ({ ...photo, photo_url: await signedPhotoUrl(photo.photo_url) }))
  )
```

- [ ] **Step 3: Run typecheck and the full test suite**

Run: `npx tsc --noEmit && npx jest`
Expected: both clean/PASS — these are server-only changes with no client
prop-shape change (both still hand a `photo_url: string` field to the same
client components), so nothing downstream should need edits.

- [ ] **Step 4: Commit**

```bash
git add app/artworks/[id]/page.tsx app/profile/page.tsx
git commit -m "Sign photo_url before sending it to the browser"
```

---

### Task 7: `components/seen-modal.tsx` — only resubmit a photo that actually changed

**Files:**
- Modify: `components/seen-modal.tsx`
- Modify: `messages/nl.json`, `messages/en.json`

**Interfaces:**
- Consumes: `VisitFormFields`'s existing `onPhotoUrlChange: (value: string) => void` prop (unchanged signature).

**Why:** `existingSeen.photo_url` arrives from the server already converted
to a signed URL (Task 6) for *display*. If the user saves the form without
touching the photo, that signed URL must NOT be resubmitted as if it were a
new photo — `POST /api/seen` (Task 3) now rejects any non-`data:`, non-null
`photo_url` with 400. The fix: track whether the user actually interacted
with the photo control, and only include `photo_url` in the request body
when they did.

- [ ] **Step 1: Add the new translation key**

In `messages/nl.json`, inside the `SeenModal` object, add after `"error"`
— wait, there is no `"error"` key in `SeenModal`; add it after
`"confirmUnmarkWithVisits"`:

```json
    "confirmUnmarkWithVisits": "Je hebt bezoeken gelogd bij dit werk. Die blijven bewaard, maar verdwijnen uit beeld totdat je het werk opnieuw als gezien markeert. Doorgaan?",
    "saveError": "Kon niet opslaan. Probeer het opnieuw."
```

In `messages/en.json`, same location:

```json
    "confirmUnmarkWithVisits": "You've logged visits for this artwork. They'll stay saved, but disappear from view until you mark it as seen again. Continue?",
    "saveError": "Could not save. Please try again."
```

- [ ] **Step 2: Update the component test to mock `fetch` and `sonner`**

`__tests__/components/seen-modal.test.tsx` currently never calls
`handleSave`, so it has no existing `fetch`/`sonner` mocking. Add both,
plus a new test, to the existing file. Add near the top, after the other
`jest.mock` calls:

```ts
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }))
```

Add to the imports:

```ts
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
```

Add a second test inside the `describe('SeenModal', ...)` block, after the
existing one:

```ts
  it('shows an error toast when saving fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false })
    const user = userEvent.setup()

    render(
      <NextIntlClientProvider locale="nl" messages={messages} timeZone="Europe/Amsterdam" now={new Date('2026-09-18T00:00:00Z')}>
        <SeenModal
          artworkId={1}
          artworkTitle="Colorful Life"
          open={true}
          onOpenChange={jest.fn()}
          onSaved={jest.fn()}
          onRemoved={jest.fn()}
        />
      </NextIntlClientProvider>
    )

    await user.click(screen.getByText('Opslaan'))

    expect(toast.error).toHaveBeenCalledWith('Kon niet opslaan. Probeer het opnieuw.')
  })
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx jest __tests__/components/seen-modal.test.tsx`
Expected: FAIL — `handleSave` doesn't check `res.ok` yet, so no toast fires.

- [ ] **Step 4: Implement the component change**

In `components/seen-modal.tsx`, add the import:

```ts
import { toast } from 'sonner'
```

Add a new state line, right after the existing `photoUrl` state:

```ts
  const [photoTouched, setPhotoTouched] = useState(false)
```

Add a small handler, right after `handleRemove` (or anywhere before the
`return`):

```ts
  function handlePhotoUrlChange(value: string) {
    setPhotoTouched(true)
    setPhotoUrl(value)
  }
```

Replace `handleSave`:

```ts
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
```

with:

```ts
  async function handleSave() {
    setSaving(true)
    const res = await fetch('/api/seen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artworkId,
        dateSeen: date.toISOString(),
        locationSeen: location || null,
        notes: notes || null,
        rating,
        ...(photoTouched ? { photo_url: photoUrl || null } : {}),
      }),
    })
    setSaving(false)
    if (!res.ok) {
      toast.error(t('saveError'))
      return
    }
    onOpenChange(false)
    onSaved()
  }
```

Change the `VisitFormFields` prop from `onPhotoUrlChange={setPhotoUrl}` to
`onPhotoUrlChange={handlePhotoUrlChange}`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest __tests__/components/seen-modal.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add components/seen-modal.tsx messages/nl.json messages/en.json __tests__/components/seen-modal.test.tsx
git commit -m "Only resubmit a photo in Mark-as-seen when it actually changed"
```

---

### Task 8: `components/visit-form-fields.tsx` — remove the paste-URL fallback

**Files:**
- Modify: `components/visit-form-fields.tsx`
- Modify: `messages/nl.json`, `messages/en.json`

**Interfaces:**
- No signature change to `VisitFormFieldsProps` — `photoUrl`/`onPhotoUrlChange` stay exactly as they are; only the internal markup and local `urlDraft` state are removed.

- [ ] **Step 1: Remove the translation key**

In `messages/nl.json`, inside `VisitForm`, delete the line:

```json
    "photoUrlPlaceholder": "Of voeg een foto-URL in...",
```

In `messages/en.json`, inside `VisitForm`, delete the line:

```json
    "photoUrlPlaceholder": "Or paste a photo URL...",
```

- [ ] **Step 2: Remove the input and its state from the component**

In `components/visit-form-fields.tsx`, delete this whole block (the
`urlDraft` state declaration, near the top of the component body):

```ts
  const [urlDraft, setUrlDraft] = useState('')
```

Delete this whole block (currently right after the photo-preview/upload
`{photoUrl ? (...) : (...)}` JSX, before the "Datum" section comment):

```tsx
        {!photoUrl && (
          <input
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onBlur={() => { if (urlDraft.trim()) onPhotoUrlChange(urlDraft.trim()) }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              if (urlDraft.trim()) onPhotoUrlChange(urlDraft.trim())
            }}
            placeholder={t('photoUrlPlaceholder')}
            className="w-full bg-white/70 border border-black/10 rounded-lg px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#4256cc]/40"
          />
        )}
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: clean (no unused-variable errors — `urlDraft`/`setUrlDraft` are
fully removed, not left dangling).

- [ ] **Step 4: Run the full test suite**

Run: `npx jest`
Expected: PASS — `seen-modal.test.tsx` doesn't assert on the paste-URL
input's presence or placeholder text, so this removal doesn't affect it.

- [ ] **Step 5: Commit**

```bash
git add components/visit-form-fields.tsx messages/nl.json messages/en.json
git commit -m "Remove the paste-a-photo-URL fallback — upload only from now on"
```

---

## Final manual verification (after all tasks, before merge)

Not a task with its own commit — a checklist to run once the branch is
otherwise complete, using this plan's Global Constraints as the acceptance
bar:

1. `npx tsc --noEmit && npx jest && npm run build` all clean.
2. On a PR preview (needs `R2_PRIVATE_BUCKET` configured in that Vercel
   environment — see the spec's "Manual prerequisite"): log in, mark a work
   as seen with a photo, confirm it displays. Reload the page — it should
   still display (proves `signedPhotoUrl` round-trips correctly through a
   fresh page load, not just the just-uploaded in-memory state).
3. Edit that same "seen" entry's notes/rating *without* touching the photo,
   save, reload — the photo should still be there and unchanged (proves the
   `photoTouched` guard in Task 7 actually prevents a spurious resubmit).
4. Replace the photo with a different one, save — open the Cloudflare R2
   dashboard for the private bucket and confirm the old object is gone and
   the new one exists (proves `deletePhotoIfOrphaned` cleanup fires and is
   correct, not just untested).
5. As a Plus user, log two visits with different photos on the same
   artwork, then delete the newer one — confirm the older visit's photo
   still displays (proves the orphan-check's cross-table guard actually
   protects a still-referenced photo, the specific hazard Task 2 exists to
   prevent).
6. Try fetching one of the private bucket's raw object URLs directly
   (construct it the same way the old public `arttracker-images` URLs look,
   substituting the private bucket's name) — it should fail/deny, proving
   the bucket truly has no public access and photos are only reachable
   through the app's signed URLs.
