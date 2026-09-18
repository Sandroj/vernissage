# Private Photo Storage — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to turn this spec into an implementation plan, then superpowers:subagent-driven-development or superpowers:executing-plans to build it.

## Goal

Move user-uploaded "mark as seen" / visit photos out of the database (currently
stored as base64 data-URLs directly in `Seen.photo_url` / `Visit.photo_url`)
into a private Cloudflare R2 bucket, served only via short-lived signed URLs.
This closes the gap flagged in
`docs/pinacot-productie-schaal-en-webverkoop-2026-09-17.md` §5 ("Privéfoto's")
— now urgent because the app actively sells a photo-centric Plus feature
(repeat-visit logging) whose photos are still unmigrated data-URLs in Turso.

## Context

- Confirmed 18 September 2026: only 5 rows total across `Seen`/`Visit` have a
  non-null `photo_url` in production, all client-compressed data-URLs
  (~100–140KB each), zero externally-pasted URLs. **Explicit product decision:
  this data does not need to be migrated or preserved** — it's the founder's
  own test data. Old rows are left exactly as they are (see "Backward
  compatibility on read" below); no migration script is part of this work.
- Existing R2 usage (`arttracker-images` bucket) is entirely public-bucket,
  bare-URL, no signed-URL code anywhere in the repo today
  (`scripts/upload-images-to-r2.mjs`, `scripts/upload-basemap-to-r2.mjs`,
  `app/api/admin/images/route.ts`). R2 has no per-object ACLs — a bucket is
  either fully public (via a custom domain) or reachable only via the S3 API
  (signed URLs), never a mix. This work therefore needs a **second, separate
  R2 bucket** with no public domain attached.
- `sharp` (`^0.34.5`) is already a dependency and already used server-side in
  `app/api/admin/images/route.ts` under `export const runtime = 'nodejs'` —
  the exact same pattern this design reuses. No API route in the app uses the
  edge runtime, so the signed-URL helper works uniformly everywhere.
- `components/visit-form-fields.tsx` currently has two ways to set a photo:
  file upload (client-compressed via `lib/image-compress.ts` into a JPEG
  data-URL, capped 1600px / quality 0.82) and a manual "paste a photo URL"
  text input (arbitrary, unvalidated `http(s)://` string). **Explicit product
  decision: drop the paste-URL fallback entirely** — nobody uses it (0 rows),
  and an externally-hosted URL can never be validated, re-encoded, or
  EXIF-stripped by us since we never receive its bytes.

## Non-goals

- Migrating or preserving the 5 existing test rows.
- A cron job or scheduled sweep for orphaned R2 objects (cleanup happens
  inline at delete/replace time only — see "Cleanup" below; revisit only if
  orphan volume ever becomes a real problem).
- Quotas / per-user storage limits (mentioned in the original plan as a
  future concern; out of scope here — current volume is trivially small).
- Any change to the *public* artwork-image pipeline (`arttracker-images`
  bucket, `Artwork.image_url`) — untouched by this work.

## Architecture

### New private bucket

A second R2 bucket, no public custom domain attached, created manually by
Sander in the Cloudflare dashboard (same one-time manual step pattern as the
existing bucket's CORS policy — not something achievable from code). New env
var `R2_PRIVATE_BUCKET` (name only; reuses the existing
`R2_ACCOUNT_ID`/`R2_ACCESS_KEY`/`R2_SECRET_KEY` credentials — same account,
a second bucket). Documented in `.env.example` alongside the existing R2
vars.

### Storage helper: `lib/photo-storage.ts`

Three functions, mirroring the existing S3 client pattern
(`scripts/upload-images-to-r2.mjs`, `app/api/admin/images/route.ts`) but
targeting the private bucket and adding the signed-URL piece that doesn't
exist anywhere in the repo yet:

- `storePhoto(userId: string, dataUrl: string): Promise<string>` — decodes
  the base64 payload, rejects (throws) if the decoded buffer exceeds 15MB
  (the same ceiling `MAX_PHOTO_FILE_SIZE` in `visit-form-fields.tsx` already
  enforces client-side — this is the server-side backstop, since a client
  check is trivially bypassable), pipes it through
  `sharp(bytes).rotate().resize({ width: 1600, height: 1600, fit: 'inside',
  withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer()` (matches the
  client's existing compression parameters; also strips EXIF as a side
  effect of re-encoding, since `sharp` omits metadata unless `.withMetadata()`
  is explicitly called), uploads to
  `photos/<userId>/<uuid>.jpg` in the private bucket via `PutObjectCommand`,
  returns the object key (not a URL).
- `signedPhotoUrl(key: string): Promise<string>` — returns a presigned
  `GetObjectCommand` URL via `@aws-sdk/s3-request-presigner`'s
  `getSignedUrl`, 1-hour expiry. **Backward-compat guard:** if `key` already
  starts with `data:` (one of the 5 pre-existing test rows, or any future
  edge case), return it unchanged instead of attempting to sign it — those
  rows keep rendering exactly as they do today, no special-cased migration
  needed, no broken images.
- `deletePhoto(key: string): Promise<void>` — `DeleteObjectCommand` against
  the private bucket; a no-op (caught, ignored) if `key` starts with `data:`
  (same guard, nothing to delete in R2 for a legacy inline row).

New dependency: `@aws-sdk/s3-request-presigner` (the existing
`@aws-sdk/client-s3` stays; this adds only the presigning helper).

### Write paths (upload)

No new API route. `POST /api/seen` and `POST /api/visits` already receive
`photo_url` as part of their existing JSON body — that contract is
unchanged. Inside each handler, before the Prisma write: if the incoming
`photo_url` value starts with `data:`, call `storePhoto(userId, photo_url)`
and use the returned **key** as the value written to the column instead of
the raw data-URL. If it's `null`/absent, unchanged. (Since the paste-URL
fallback is removed client-side, any other non-`data:`, non-null string
reaching the API is now unexpected input — treat it as `data:`-only or
reject with 400, matching the same defensive-validation level the rest of
these routes already have for other fields.)

`DELETE /api/visits/[id]`'s resync-to-previous-visit logic, and
`POST /api/seen`'s upsert-overwrite path, already read the *old* `photo_url`
before writing the new one — add a `deletePhoto(oldKey)` call at each site
where a photo is being replaced or the row is being removed, so the private
bucket doesn't accumulate orphans from normal overwrite/delete usage.

### Read paths (serving photos back)

Every place that currently sends `photo_url` to the browser converts the
stored value through `signedPhotoUrl()` immediately before responding:

- `GET /api/visits` (used by `VisitHistory`'s `refresh()`)
- `app/artworks/[id]/page.tsx`'s server-fetched `initialSeen` (consumed by
  `SeenModal`'s existing-photo preview)
- `app/profile/page.tsx`'s `myPhotos` query (the gallery added earlier this
  session)

All three are plain Node-runtime code (Server Component or Route Handler),
so `signedPhotoUrl()` — which needs the R2 credentials and thus can only run
server-side — works identically in each without special-casing.

### Client changes

`components/visit-form-fields.tsx`: remove the "paste a photo URL" `<input>`
entirely, along with its `urlDraft` state and blur/`Enter`-commit handlers
(added earlier this session specifically to fix that input — this change
removes the surface those handlers existed for). The file-upload path is
unchanged: it still produces a compressed data-URL client-side and hands it
to `onPhotoUrlChange`, exactly as today; the server-side processing above is
additive; the client doesn't need to know its photo now round-trips through
R2. Two translation keys become dead (`VisitForm.photoUrlPlaceholder`
under both locales) — remove them.

### Backward compatibility on read

The 5 existing test rows keep their literal `data:` value in the DB
(untouched — no migration). `signedPhotoUrl()`'s guard passes them through
unchanged, so they keep rendering exactly as before. This is a deliberate,
permanent (not transitional) code path per the "don't worry about migrating"
decision — not dead code to clean up later.

## Error handling

- `storePhoto` throws on: oversized payload (>15MB decoded), undecodable
  base64, `sharp` decode failure. The two call sites (`/api/seen`,
  `/api/visits` POST handlers) catch and return a 400 with a translated
  error message, mirroring the existing `photoTooLarge` toast pattern
  already in `VisitFormFields` (that client-side check remains as the fast
  path; this is the server-side backstop for a client that skips it).
- `signedPhotoUrl` / `deletePhoto` failures (R2 unreachable, bad credentials)
  are infrastructure errors, not user input errors — let them propagate as
  a 500, consistent with how the rest of these routes handle unexpected
  Prisma/network failures today (no bespoke handling exists for that
  elsewhere in the codebase; this doesn't invent a new pattern).

## Testing

- `lib/photo-storage.ts`: unit tests mocking `@aws-sdk/client-s3` and
  `@aws-sdk/s3-request-presigner` (same mocking style the existing test
  suite already uses for `@/lib/prisma` in `__tests__/api/visits.test.ts`)
  — cover the oversized-payload rejection, the `data:`-passthrough guard on
  both `signedPhotoUrl` and `deletePhoto`, and that `storePhoto` calls
  `PutObjectCommand` with the expected bucket/key shape.
- `app/api/seen/route.ts`, `app/api/visits/route.ts`,
  `app/api/visits/[id]/route.ts`: extend the existing mocked-Prisma test
  style to also mock `lib/photo-storage`, verifying the route calls
  `storePhoto`/`deletePhoto` at the right times and writes the returned key
  (not the raw data-URL) to Prisma.
- No new manual/live test beyond what the existing PR-preview workflow
  already does for this app (register/login on the Vercel preview, mark a
  work as seen with a photo, confirm it displays and the underlying R2
  object is private — i.e. the raw `pub-xxx.r2.dev`-style bucket URL for
  that key returns an access error while the app's own signed URL works).

## Manual prerequisite (before implementation can be deployed)

Sander creates the new private R2 bucket in the Cloudflare dashboard (no
public custom domain attached) and adds `R2_PRIVATE_BUCKET=<name>` to
`.env.local` and Vercel's environment variables. Implementation work can
proceed in parallel/beforehand on a feature branch, but the feature cannot
be exercised end-to-end (locally or on a PR preview) until this exists.
