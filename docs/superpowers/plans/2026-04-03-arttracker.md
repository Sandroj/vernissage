# ArtTracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bouw een Next.js webapp waarmee gebruikers kunstwerken kunnen bijhouden die ze hebben gezien, startend met 616 Kandinsky-werken.

**Architecture:** Next.js 14 App Router met Prisma ORM (SQLite lokaal), NextAuth.js voor auth (Google + e-mail/wachtwoord), Tailwind CSS + shadcn/ui voor UI. API routes in `app/api/`. Alle interactieve componenten zijn Client Components; pagina's zijn Server Components die data ophalen via Prisma.

**Tech Stack:** Next.js 14, TypeScript, Prisma + SQLite, NextAuth.js v4, Tailwind CSS, shadcn/ui, bcryptjs, Jest + React Testing Library

---

## Bestandsstructuur

```
arttracker/
├── app/
│   ├── layout.tsx                    # Root layout (nav, session provider)
│   ├── page.tsx                      # Dashboard
│   ├── login/page.tsx                # Login pagina
│   ├── artists/
│   │   ├── page.tsx                  # Kunstenaars overzicht + zoek
│   │   └── [slug]/page.tsx           # Kunstenaar detail + werkenraster
│   ├── artworks/[id]/page.tsx        # Artwork detail
│   ├── discover/page.tsx             # Kunstenaars-keuzescherm
│   ├── profile/page.tsx              # Profiel + instellingen
│   ├── admin/page.tsx                # Import + handmatig toevoegen
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── artists/route.ts          # GET lijst, POST nieuw
│       ├── artworks/route.ts         # GET lijst (met filters)
│       ├── seen/route.ts             # POST aanmaken
│       ├── seen/[id]/route.ts        # PUT bewerken, DELETE
│       ├── museums/route.ts          # GET typeahead
│       ├── votes/route.ts            # POST artist vote
│       └── import/route.ts           # POST scraper import
├── components/
│   ├── nav.tsx                       # Navigatie (hamburger op mobiel)
│   ├── artist-card.tsx               # Kunstenaar card met voortgangsbalk
│   ├── artwork-grid.tsx              # Grid met filter
│   ├── artwork-card.tsx              # Enkele artwork in grid
│   ├── seen-modal.tsx                # Dialog: markeer als gezien
│   ├── museum-search.tsx             # Command typeahead voor musea
│   ├── star-rating.tsx               # 1-5 sterren input
│   ├── progress-bar.tsx              # Geanimeerde voortgangsbalk
│   ├── lightbox.tsx                  # Fullscreen afbeelding
│   └── share-menu.tsx                # DropdownMenu: deel werk
├── lib/
│   ├── prisma.ts                     # Prisma client singleton
│   ├── auth.ts                       # NextAuth config
│   └── utils.ts                      # cn(), slugify(), etc.
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                       # Kandinsky import + afbeeldingen kopiëren
├── public/images/
│   ├── artworks/                     # Gekopieerd door seed
│   └── discover/                     # Al aanwezig
├── middleware.ts                     # Bescherm routes
└── .env.local                        # DATABASE_URL, NEXTAUTH_SECRET, etc.
```

---

## Task 1: Project scaffolding

**Files:**
- Create: `package.json`, `next.config.js`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`
- Create: `.env.local`
- Create: `lib/utils.ts`

- [ ] **Stap 1: Maak Next.js project aan**

```bash
cd ~/claude-code/projects/art/arttracker
npx create-next-app@14 . --typescript --tailwind --eslint --app --no-src-dir --import-alias="@/*" --yes
```

Verwacht: Next.js project aangemaakt. Bevestig met `ls` — je ziet `app/`, `package.json`, `next.config.js`, `tsconfig.json`.

- [ ] **Stap 2: Installeer extra dependencies**

```bash
npm install prisma @prisma/client next-auth @auth/prisma-adapter bcryptjs
npm install -D @types/bcryptjs ts-node
npm install @radix-ui/react-dialog @radix-ui/react-popover @radix-ui/react-dropdown-menu
```

- [ ] **Stap 3: Initialiseer shadcn/ui**

```bash
npx shadcn-ui@latest init
```

Kies bij de prompts: TypeScript=Yes, style=Default, base color=Slate, CSS variables=Yes, tailwind config=tailwind.config.ts, components alias=@/components, utils alias=@/lib/utils.

- [ ] **Stap 4: Installeer shadcn componenten**

```bash
npx shadcn-ui@latest add button dialog input textarea popover calendar command dropdown-menu progress tabs badge toast
```

- [ ] **Stap 5: Installeer test dependencies**

```bash
npm install -D jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event ts-jest @types/jest
```

- [ ] **Stap 6: Maak Jest config**

Maak `jest.config.ts`:

```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
}

export default createJestConfig(config)
```

Maak `jest.setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Stap 7: Maak .env.local**

```bash
cat > .env.local << 'EOF'
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dev-secret-vervang-in-productie-met-openssl-rand-base64-32"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
EOF
```

- [ ] **Stap 8: Maak lib/utils.ts**

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
```

- [ ] **Stap 9: Test utils**

Maak `__tests__/lib/utils.test.ts`:

```typescript
import { slugify } from '@/lib/utils'

describe('slugify', () => {
  it('lowercases and replaces spaces', () => {
    expect(slugify('Wassily Kandinsky')).toBe('wassily-kandinsky')
  })
  it('handles accented characters', () => {
    expect(slugify('Dalí')).toBe('dali')
  })
  it('strips leading/trailing dashes', () => {
    expect(slugify('  Monet  ')).toBe('monet')
  })
})
```

```bash
npx jest __tests__/lib/utils.test.ts
```

Verwacht: 3 tests passed.

- [ ] **Stap 10: Commit**

```bash
git add -A
git commit -m "feat: project scaffolding — Next.js 14, shadcn/ui, Jest"
```

---

## Task 2: Prisma schema + migratie

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/prisma.ts`

- [ ] **Stap 1: Initialiseer Prisma**

```bash
npx prisma init --datasource-provider sqlite
```

- [ ] **Stap 2: Schrijf schema**

Overschrijf `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Artist {
  id           Int       @id @default(autoincrement())
  name         String
  slug         String    @unique
  birth_year   Int?
  death_year   Int?
  nationality  String?
  bio          String?
  portrait_url String?
  createdAt    DateTime  @default(now())
  artworks     Artwork[]
}

model Museum {
  id       Int       @id @default(autoincrement())
  name     String
  city     String
  country  String
  website  String?
  artworks Artwork[]
}

model Artwork {
  id               Int      @id @default(autoincrement())
  artistId         Int
  museumId         Int?
  title            String
  year_start       Int?
  year_end         Int?
  medium_raw       String?
  type_normalized  String?
  dimensions_raw   String?
  image_url        String?
  image_local_path String?
  source_url       String?
  artist           Artist   @relation(fields: [artistId], references: [id])
  museum           Museum?  @relation(fields: [museumId], references: [id])
  seenBy           Seen[]
}

model User {
  id            String       @id @default(cuid())
  name          String?
  email         String       @unique
  emailVerified DateTime?
  image         String?
  password      String?
  seenPublic    Boolean      @default(true)
  createdAt     DateTime     @default(now())
  accounts      Account[]
  sessions      Session[]
  seen          Seen[]
  votes         ArtistVote[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Seen {
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

  @@unique([userId, artworkId])
}

model ArtistVote {
  id         Int      @id @default(autoincrement())
  userId     String
  artistName String
  createdAt  DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, artistName])
}
```

- [ ] **Stap 3: Draai migratie**

```bash
npx prisma migrate dev --name init
```

Verwacht: `prisma/migrations/[timestamp]_init/migration.sql` aangemaakt, `prisma/dev.db` aangemaakt.

- [ ] **Stap 4: Maak Prisma client singleton**

Maak `lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ log: ['error'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Stap 5: Commit**

```bash
git add -A
git commit -m "feat: Prisma schema + SQLite migratie"
```

---

## Task 3: Seed script — Kandinsky import

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (voeg prisma.seed toe)

- [ ] **Stap 1: Schrijf seed script**

Maak `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
import Database from 'better-sqlite3'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

const SQLITE_SOURCE = path.resolve(
  __dirname,
  '../../sources/kandinsky_scraper_bundle/kandinsky_full/data/kandinsky_works.sqlite'
)
const IMAGES_SOURCE = path.resolve(
  __dirname,
  '../../sources/kandinsky_scraper_bundle/kandinsky_full/images'
)
const IMAGES_DEST = path.resolve(__dirname, '../public/images/artworks')

async function main() {
  console.log('Seeding ArtTracker database...')

  // 1. Zorg dat images-map bestaat
  fs.mkdirSync(IMAGES_DEST, { recursive: true })

  // 2. Lees Kandinsky data uit source SQLite
  const sourceDb = new Database(SQLITE_SOURCE, { readonly: true })
  const rows = sourceDb.prepare('SELECT * FROM works').all() as any[]
  sourceDb.close()

  console.log(`Found ${rows.length} Kandinsky works`)

  // 3. Maak kunstenaar aan
  const artist = await prisma.artist.upsert({
    where: { slug: 'wassily-kandinsky' },
    update: {},
    create: {
      name: 'Wassily Kandinsky',
      slug: 'wassily-kandinsky',
      birth_year: 1866,
      death_year: 1944,
      nationality: 'Russisch',
      bio: 'Wassily Kandinsky (1866–1944) was een Russisch-Franse schilder en kunsttheoreticus, beschouwd als pionier van de abstracte kunst. Hij doceerde aan het Bauhaus en ontwikkelde een diepgaande theorie over kleur en vorm.',
    },
  })

  console.log(`Artist: ${artist.name} (id: ${artist.id})`)

  // 4. Verwerk musea via findOrCreate pattern
  const museumCache = new Map<string, number>()

  async function getOrCreateMuseum(name: string, city: string): Promise<number> {
    const key = `${name}||${city}`
    if (museumCache.has(key)) return museumCache.get(key)!
    let museum = await prisma.museum.findFirst({ where: { name, city } })
    if (!museum) {
      museum = await prisma.museum.create({
        data: { name, city, country: inferCountry(city) },
      })
    }
    museumCache.set(key, museum.id)
    return museum.id
  }

  // 6. Verwerk werken
  let created = 0
  let skipped = 0

  for (const row of rows) {
    // Kopieer afbeelding
    const srcImg = path.join(IMAGES_SOURCE, `work-${row.work_id}.jpg`)
    const destImg = path.join(IMAGES_DEST, `work-${row.work_id}.jpg`)
    if (fs.existsSync(srcImg) && !fs.existsSync(destImg)) {
      fs.copyFileSync(srcImg, destImg)
    }

    // Museum
    let museumId: number | undefined
    if (row.holder_name && row.holder_city) {
      museumId = await getOrCreateMuseum(row.holder_name, row.holder_city)
    }

    // Werk
    const existing = await prisma.artwork.findFirst({
      where: { artistId: artist.id, title: row.title, year_start: row.year_start },
    })

    if (existing) {
      skipped++
      continue
    }

    await prisma.artwork.create({
      data: {
        artistId: artist.id,
        museumId,
        title: row.title,
        year_start: row.year_start,
        year_end: row.year_end,
        medium_raw: row.medium_raw,
        type_normalized: row.type_normalized,
        dimensions_raw: row.dimensions_raw,
        image_url: row.image_url,
        image_local_path: `/images/artworks/work-${row.work_id}.jpg`,
        source_url: row.source_url,
      },
    })
    created++
  }

  console.log(`Artworks: ${created} aangemaakt, ${skipped} overgeslagen`)
  console.log('Seed voltooid.')
}

function inferCountry(city: string): string {
  const map: Record<string, string> = {
    Munich: 'Duitsland', Berlin: 'Duitsland', Hamburg: 'Duitsland',
    Paris: 'Frankrijk', Lyon: 'Frankrijk',
    Amsterdam: 'Nederland', Rotterdam: 'Nederland', 'The Hague': 'Nederland',
    Moscow: 'Rusland', 'Saint Petersburg': 'Rusland',
    'New York': 'Verenigde Staten', Chicago: 'Verenigde Staten', Washington: 'Verenigde Staten',
    London: 'Verenigd Koninkrijk',
    Vienna: 'Oostenrijk',
    Zurich: 'Zwitserland', Basel: 'Zwitserland',
    Milan: 'Italië', Rome: 'Italië',
    Madrid: 'Spanje', Barcelona: 'Spanje',
    Stockholm: 'Zweden',
    Oslo: 'Noorwegen',
    Copenhagen: 'Denemarken',
  }
  return map[city] ?? 'Onbekend'
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

- [ ] **Stap 2: Installeer better-sqlite3**

```bash
npm install better-sqlite3
npm install -D @types/better-sqlite3
```

- [ ] **Stap 3: Voeg seed toe aan package.json**

In `package.json`, voeg toe:

```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

- [ ] **Stap 4: Draai seed**

```bash
npx prisma db seed
```

Verwacht output eindigt met: `Artworks: 616 aangemaakt, 0 overgeslagen` en `Seed voltooid.`

Verifieer:
```bash
npx prisma studio
```

Open http://localhost:5555 — je ziet Artist (1 record), Artwork (616 records), Museum (X records).

- [ ] **Stap 5: Commit**

```bash
git add -A
git commit -m "feat: seed script — Kandinsky 616 werken geïmporteerd"
```

---

## Task 4: NextAuth setup

**Files:**
- Create: `lib/auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `middleware.ts`

- [ ] **Stap 1: Schrijf auth config**

Maak `lib/auth.ts`:

```typescript
import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
    CredentialsProvider({
      name: 'E-mail',
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Wachtwoord', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })
        if (!user?.password) return null
        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null
        return { id: user.id, email: user.email, name: user.name, image: user.image }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      if (token && session.user) session.user.id = token.id as string
      return session
    },
  },
}
```

- [ ] **Stap 2: Maak NextAuth API route**

Maak `app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

- [ ] **Stap 3: Voeg id toe aan NextAuth types**

Maak `types/next-auth.d.ts`:

```typescript
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: { id: string } & DefaultSession['user']
  }
}
```

- [ ] **Stap 4: Maak middleware**

Maak `middleware.ts`:

```typescript
export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/profile/:path*',
    '/admin/:path*',
    '/discover/:path*',
  ],
}
```

- [ ] **Stap 5: Registreer API route voor gebruikersregistratie**

Maak `app/api/auth/register/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const { name, email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'E-mail en wachtwoord zijn verplicht' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Dit e-mailadres is al in gebruik' }, { status: 409 })
  }

  const hashed = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { name, email, password: hashed },
  })

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 })
}
```

- [ ] **Stap 6: Commit**

```bash
git add -A
git commit -m "feat: NextAuth — Google + e-mail/wachtwoord auth"
```

---

## Task 5: Root layout + Navigatie

**Files:**
- Create: `components/nav.tsx`
- Modify: `app/layout.tsx`
- Create: `components/session-provider.tsx`

- [ ] **Stap 1: Maak SessionProvider wrapper**

Maak `components/session-provider.tsx`:

```typescript
'use client'
import { SessionProvider } from 'next-auth/react'

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
```

- [ ] **Stap 2: Schrijf Nav component**

Maak `components/nav.tsx`:

```typescript
'use client'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'

export default function Nav() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)

  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/artists', label: 'Kunstenaars' },
    { href: '/discover', label: 'Ontdekken' },
    ...(session ? [{ href: '/profile', label: 'Profiel' }] : []),
  ]

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-white text-lg">
          ArtTracker
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-slate-400 hover:text-white text-sm transition-colors">
              {l.label}
            </Link>
          ))}
          {session ? (
            <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-slate-400 hover:text-white">
              Uitloggen
            </Button>
          ) : (
            <Link href="/login">
              <Button size="sm">Inloggen</Button>
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 py-3 flex flex-col gap-3">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-slate-300 text-sm py-1" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          {session ? (
            <button className="text-slate-400 text-sm text-left py-1"
              onClick={() => signOut({ callbackUrl: '/login' })}>
              Uitloggen
            </button>
          ) : (
            <Link href="/login" className="text-indigo-400 text-sm py-1" onClick={() => setOpen(false)}>
              Inloggen
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
```

- [ ] **Stap 3: Installeer lucide-react**

```bash
npm install lucide-react
```

- [ ] **Stap 4: Update root layout**

Overschrijf `app/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from '@/components/session-provider'
import Nav from '@/components/nav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ArtTracker',
  description: 'Houd bij welke kunstwerken je hebt gezien',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className={`${inter.className} bg-slate-950 text-slate-100 min-h-screen`}>
        <Providers>
          <Nav />
          <main className="max-w-6xl mx-auto px-4 py-6">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}
```

- [ ] **Stap 5: Test Nav rendert**

Maak `__tests__/components/nav.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import Nav from '@/components/nav'

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: null }),
  signOut: jest.fn(),
}))

jest.mock('next/link', () => ({ children, href }: any) => <a href={href}>{children}</a>)

describe('Nav', () => {
  it('toont ArtTracker logo', () => {
    render(<Nav />)
    expect(screen.getByText('ArtTracker')).toBeInTheDocument()
  })
  it('toont Inloggen als niet ingelogd', () => {
    render(<Nav />)
    expect(screen.getByText('Inloggen')).toBeInTheDocument()
  })
})
```

```bash
npx jest __tests__/components/nav.test.tsx
```

Verwacht: 2 tests passed.

- [ ] **Stap 6: Commit**

```bash
git add -A
git commit -m "feat: root layout + Nav component (responsive)"
```

---

## Task 6: Login pagina

**Files:**
- Create: `app/login/page.tsx`

- [ ] **Stap 1: Schrijf login pagina**

Maak `app/login/page.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (mode === 'register') {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Registratie mislukt')
        setLoading(false)
        return
      }
    }

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Onjuist e-mailadres of wachtwoord')
    } else {
      router.push(mode === 'register' ? '/discover' : '/')
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">ArtTracker</h1>
          <p className="text-slate-400 mt-1 text-sm">
            {mode === 'login' ? 'Inloggen op je account' : 'Nieuw account aanmaken'}
          </p>
        </div>

        <Button
          className="w-full"
          variant="outline"
          onClick={() => signIn('google', { callbackUrl: '/' })}
        >
          Inloggen met Google
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-slate-500 text-xs">of</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <Input
              placeholder="Naam"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-900 border-slate-700"
            />
          )}
          <Input
            type="email"
            placeholder="E-mailadres"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-slate-900 border-slate-700"
          />
          <Input
            type="password"
            placeholder="Wachtwoord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-slate-900 border-slate-700"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Bezig...' : mode === 'login' ? 'Inloggen' : 'Account aanmaken'}
          </Button>
        </form>

        <p className="text-center text-sm text-slate-400">
          {mode === 'login' ? 'Nog geen account?' : 'Al een account?'}{' '}
          <button
            className="text-indigo-400 hover:underline"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'Registreer hier' : 'Inloggen'}
          </button>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Stap 2: Draai dev server en test login handmatig**

```bash
npm run dev
```

Open http://localhost:3000/login. Maak een account aan met e-mail. Verwacht: redirect naar `/discover`.

- [ ] **Stap 3: Commit**

```bash
git add -A
git commit -m "feat: login pagina — Google + e-mail/wachtwoord registratie"
```

---

## Task 7: API routes

**Files:**
- Create: `app/api/artists/route.ts`
- Create: `app/api/artworks/route.ts`
- Create: `app/api/seen/route.ts`
- Create: `app/api/seen/[id]/route.ts`
- Create: `app/api/museums/route.ts`
- Create: `app/api/votes/route.ts`

- [ ] **Stap 1: Artists API**

Maak `app/api/artists/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { slugify } from '@/lib/utils'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''

  const artists = await prisma.artist.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { nationality: { contains: q } },
          ],
        }
      : undefined,
    include: { _count: { select: { artworks: true } } },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(artists)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const data = await req.json()
  const artist = await prisma.artist.create({
    data: { ...data, slug: slugify(data.name) },
  })
  return NextResponse.json(artist, { status: 201 })
}
```

- [ ] **Stap 2: Artworks API**

Maak `app/api/artworks/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const artistId = searchParams.get('artistId')
  const type = searchParams.get('type')
  const city = searchParams.get('city')

  const artworks = await prisma.artwork.findMany({
    where: {
      ...(artistId ? { artistId: parseInt(artistId) } : {}),
      ...(type ? { type_normalized: type } : {}),
      ...(city ? { museum: { city: { contains: city } } } : {}),
    },
    include: {
      museum: true,
      _count: { select: { seenBy: { where: { user: { seenPublic: true } } } } },
    },
    orderBy: [{ year_start: 'asc' }, { title: 'asc' }],
  })

  return NextResponse.json(artworks)
}
```

- [ ] **Stap 3: Seen API**

Maak `app/api/seen/route.ts`:

```typescript
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

export async function GET(req: Request) {
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

Maak `app/api/seen/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const data = await req.json()
  const seen = await prisma.seen.update({
    where: { id: parseInt(params.id), userId: session.user.id },
    data: { ...data, dateSeen: data.dateSeen ? new Date(data.dateSeen) : undefined },
  })

  return NextResponse.json(seen)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  await prisma.seen.delete({
    where: { id: parseInt(params.id), userId: session.user.id },
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Stap 4: Museums API (typeahead)**

Maak `app/api/museums/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''

  const museums = await prisma.museum.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { city: { contains: q } },
          ],
        }
      : undefined,
    take: 10,
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(museums)
}
```

- [ ] **Stap 5: Votes API**

Maak `app/api/votes/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { artistNames }: { artistNames: string[] } = await req.json()

  // Verwijder oude stemmen van deze gebruiker
  await prisma.artistVote.deleteMany({ where: { userId: session.user.id } })

  // Sla nieuwe stemmen op
  await prisma.artistVote.createMany({
    data: artistNames.map((artistName) => ({
      userId: session.user.id,
      artistName,
    })),
    skipDuplicates: true,
  })

  return NextResponse.json({ saved: artistNames.length })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json([])

  const votes = await prisma.artistVote.findMany({
    where: { userId: session.user.id },
    select: { artistName: true },
  })

  return NextResponse.json(votes.map((v) => v.artistName))
}
```

- [ ] **Stap 6: Commit**

```bash
git add -A
git commit -m "feat: alle API routes — artists, artworks, seen, museums, votes"
```

---

## Task 8: Gedeelde UI-componenten

**Files:**
- Create: `components/progress-bar.tsx`
- Create: `components/star-rating.tsx`
- Create: `components/lightbox.tsx`
- Create: `components/share-menu.tsx`

- [ ] **Stap 1: ProgressBar**

Maak `components/progress-bar.tsx`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number   // 0–100
  seen: number
  total: number
  className?: string
  animate?: boolean
}

export default function ProgressBar({ value, seen, total, className, animate = true }: ProgressBarProps) {
  const [display, setDisplay] = useState(animate ? Math.max(0, value - 5) : value)

  useEffect(() => {
    if (!animate) return
    const timer = setTimeout(() => setDisplay(value), 50)
    return () => clearTimeout(timer)
  }, [value, animate])

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex justify-between text-xs text-slate-400">
        <span>{seen} van {total} gezien</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${display}%` }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Stap 2: Test ProgressBar**

Maak `__tests__/components/progress-bar.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import ProgressBar from '@/components/progress-bar'

describe('ProgressBar', () => {
  it('toont gezien/totaal', () => {
    render(<ProgressBar value={12} seen={76} total={616} animate={false} />)
    expect(screen.getByText('76 van 616 gezien')).toBeInTheDocument()
  })
  it('toont percentage afgerond', () => {
    render(<ProgressBar value={12.3} seen={76} total={616} animate={false} />)
    expect(screen.getByText('12%')).toBeInTheDocument()
  })
})
```

```bash
npx jest __tests__/components/progress-bar.test.tsx
```

Verwacht: 2 tests passed.

- [ ] **Stap 3: StarRating**

Maak `components/star-rating.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  value: number | null
  onChange: (rating: number) => void
}

export default function StarRating({ value, onChange }: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null)

  return (
    <div className="flex gap-1" role="group" aria-label="Waardering">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(null)}
          className="focus:outline-none"
          aria-label={`${star} ster${star !== 1 ? 'ren' : ''}`}
        >
          <Star
            size={20}
            className={cn(
              'transition-colors',
              (hover ?? value ?? 0) >= star
                ? 'fill-amber-400 text-amber-400'
                : 'text-slate-600'
            )}
          />
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Stap 4: Lightbox**

Maak `components/lightbox.tsx`:

```typescript
'use client'
import { useEffect } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'

interface LightboxProps {
  src: string
  alt: string
  onClose: () => void
}

export default function Lightbox({ src, alt, onClose }: LightboxProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white"
        onClick={onClose}
        aria-label="Sluiten"
      >
        <X size={28} />
      </button>
      <div
        className="max-w-[90vw] max-h-[90vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-[90vw] max-h-[90vh] object-contain"
        />
      </div>
    </div>
  )
}
```

- [ ] **Stap 5: ShareMenu**

Maak `components/share-menu.tsx`:

```typescript
'use client'
import { Share2, Link2, Twitter, Instagram, Mail } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

interface ShareMenuProps {
  url: string
  title: string
}

export default function ShareMenu({ url, title }: ShareMenuProps) {
  const { toast } = useToast()
  const fullUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}${url}`

  function copyLink() {
    navigator.clipboard.writeText(fullUrl)
    toast({ description: 'Link gekopieerd' })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 size={15} /> Delen
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={copyLink} className="gap-2">
          <Link2 size={15} /> Kopieer link
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(fullUrl)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <Twitter size={15} /> Deel op Twitter/X
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(fullUrl)}`}
            className="flex items-center gap-2"
          >
            <Mail size={15} /> Deel via e-mail
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(fullUrl); toast({ description: 'Link gekopieerd voor Instagram bio' }) }}
          className="gap-2">
          <Instagram size={15} /> Kopieer voor Instagram
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Stap 6: Commit**

```bash
git add -A
git commit -m "feat: gedeelde UI-componenten — ProgressBar, StarRating, Lightbox, ShareMenu"
```

---

## Task 9: Artists lijst pagina

**Files:**
- Create: `components/artist-card.tsx`
- Create: `app/artists/page.tsx`

- [ ] **Stap 1: ArtistCard component**

Maak `components/artist-card.tsx`:

```typescript
import Link from 'next/link'
import Image from 'next/image'
import ProgressBar from '@/components/progress-bar'

interface ArtistCardProps {
  artist: {
    id: number
    name: string
    slug: string
    nationality?: string | null
    portrait_url?: string | null
    _count: { artworks: number }
  }
  seenCount: number
}

export default function ArtistCard({ artist, seenCount }: ArtistCardProps) {
  const total = artist._count.artworks
  const pct = total > 0 ? (seenCount / total) * 100 : 0

  return (
    <Link
      href={`/artists/${artist.slug}`}
      className="bg-slate-900 rounded-xl p-4 hover:bg-slate-800 transition-colors block"
    >
      <div className="flex items-center gap-4 mb-3">
        <div className="w-14 h-14 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
          {artist.portrait_url ? (
            <img src={artist.portrait_url} alt={artist.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 text-xl font-bold">
              {artist.name[0]}
            </div>
          )}
        </div>
        <div>
          <h2 className="font-semibold text-white">{artist.name}</h2>
          {artist.nationality && (
            <p className="text-slate-400 text-sm">{artist.nationality}</p>
          )}
        </div>
      </div>
      <ProgressBar value={pct} seen={seenCount} total={total} animate={false} />
    </Link>
  )
}
```

- [ ] **Stap 2: Artists list pagina**

Maak `app/artists/page.tsx`:

```typescript
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import ArtistCard from '@/components/artist-card'
import ArtistsSearch from '@/components/artists-search'

export default async function ArtistsPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const session = await getServerSession(authOptions)
  const q = searchParams.q ?? ''

  const artists = await prisma.artist.findMany({
    where: q
      ? { OR: [{ name: { contains: q } }, { nationality: { contains: q } }] }
      : undefined,
    include: { _count: { select: { artworks: true } } },
    orderBy: { name: 'asc' },
  })

  // Haal seen-counts op voor ingelogde gebruiker
  const seenCounts: Record<number, number> = {}
  if (session?.user?.id) {
    const counts = await prisma.seen.groupBy({
      by: ['userId'],
      where: {
        userId: session.user.id,
        artwork: { artistId: { in: artists.map((a) => a.id) } },
      },
      _count: true,
    })
    // Per artist seen count
    for (const artist of artists) {
      const count = await prisma.seen.count({
        where: { userId: session.user.id, artwork: { artistId: artist.id } },
      })
      seenCounts[artist.id] = count
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Kunstenaars</h1>
        <span className="text-slate-400 text-sm">{artists.length} kunstenaar{artists.length !== 1 ? 's' : ''}</span>
      </div>

      <ArtistsSearch defaultValue={q} />

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {artists.map((artist) => (
          <ArtistCard
            key={artist.id}
            artist={artist}
            seenCount={seenCounts[artist.id] ?? 0}
          />
        ))}
        {artists.length === 0 && (
          <p className="text-slate-400 col-span-full text-center py-12">
            Geen kunstenaars gevonden voor &ldquo;{q}&rdquo;
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Stap 3: ArtistsSearch client component**

Maak `components/artists-search.tsx`:

```typescript
'use client'
import { useRouter, usePathname } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { useTransition } from 'react'

export default function ArtistsSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    startTransition(() => {
      router.push(`${pathname}${q ? `?q=${encodeURIComponent(q)}` : ''}`)
    })
  }

  return (
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <Input
        defaultValue={defaultValue}
        onChange={handleChange}
        placeholder="Zoek op naam of nationaliteit..."
        className="pl-9 bg-slate-900 border-slate-700"
      />
    </div>
  )
}
```

- [ ] **Stap 4: Commit**

```bash
git add -A
git commit -m "feat: /artists pagina met zoek + voortgangsbalken"
```

---

## Task 10: Seen modal

**Files:**
- Create: `components/museum-search.tsx`
- Create: `components/seen-modal.tsx`

- [ ] **Stap 1: MuseumSearch component**

Maak `components/museum-search.tsx`:

```typescript
'use client'
import { useState, useEffect } from 'react'
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { MapPin } from 'lucide-react'

interface Museum { id: number; name: string; city: string }

interface MuseumSearchProps {
  value: string
  onChange: (value: string) => void
}

export default function MuseumSearch({ value, onChange }: MuseumSearchProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Museum[]>([])

  useEffect(() => {
    if (query.length < 1) { setResults([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/museums?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(data)
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-start gap-2 text-left font-normal bg-slate-900 border-slate-700"
        >
          <MapPin size={14} className="text-slate-400 flex-shrink-0" />
          <span className={value ? 'text-white' : 'text-slate-400'}>
            {value || 'Zoek museum of typ locatie...'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[320px]" align="start">
        <Command>
          <CommandInput
            placeholder="Zoek museum..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              <button
                className="px-3 py-2 text-sm text-slate-300 w-full text-left hover:bg-slate-800"
                onClick={() => { onChange(query); setOpen(false) }}
              >
                Gebruik &ldquo;{query}&rdquo; als locatie
              </button>
            </CommandEmpty>
            {results.map((m) => (
              <CommandItem
                key={m.id}
                value={`${m.name} ${m.city}`}
                onSelect={() => { onChange(`${m.name}, ${m.city}`); setOpen(false) }}
              >
                <MapPin size={13} className="mr-2 text-slate-400" />
                <span>{m.name}</span>
                <span className="ml-auto text-slate-400 text-xs">{m.city}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Stap 2: SeenModal component**

Maak `components/seen-modal.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import MuseumSearch from '@/components/museum-search'
import StarRating from '@/components/star-rating'

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
  } | null
  onSaved: () => void
}

export default function SeenModal({
  artworkId,
  artworkTitle,
  open,
  onOpenChange,
  existingSeen,
  onSaved,
}: SeenModalProps) {
  const [date, setDate] = useState<Date>(
    existingSeen ? new Date(existingSeen.dateSeen) : new Date()
  )
  const [calOpen, setCalOpen] = useState(false)
  const [location, setLocation] = useState(existingSeen?.locationSeen ?? '')
  const [notes, setNotes] = useState(existingSeen?.notes ?? '')
  const [rating, setRating] = useState<number | null>(existingSeen?.rating ?? null)
  const [photoUrl, setPhotoUrl] = useState(existingSeen?.photo_url ?? '')
  const [saving, setSaving] = useState(false)

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            {existingSeen ? 'Bewerk' : 'Markeer als gezien'}
          </DialogTitle>
          <p className="text-slate-400 text-sm">{artworkTitle}</p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Datum */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400 uppercase tracking-wide">Datum</label>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2 bg-slate-800 border-slate-700 text-white">
                  <CalendarIcon size={14} />
                  {format(date, 'd MMMM yyyy', { locale: nl })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => { if (d) { setDate(d); setCalOpen(false) } }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Locatie */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400 uppercase tracking-wide">Locatie</label>
            <MuseumSearch value={location} onChange={setLocation} />
          </div>

          {/* Waardering */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400 uppercase tracking-wide">Waardering</label>
            <StarRating value={rating} onChange={setRating} />
          </div>

          {/* Notitie */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400 uppercase tracking-wide">Notitie</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Wat vond je van dit werk?"
              className="bg-slate-800 border-slate-700 text-white resize-none"
              rows={3}
            />
          </div>

          {/* Foto URL */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400 uppercase tracking-wide">Foto (optioneel)</label>
            <Input
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="URL van een foto die je maakte"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? 'Opslaan...' : 'Opslaan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Stap 3: Installeer date-fns**

```bash
npm install date-fns
```

- [ ] **Stap 4: Test SeenModal rendert correct**

Maak `__tests__/components/seen-modal.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import SeenModal from '@/components/seen-modal'

jest.mock('next-auth/react', () => ({ useSession: () => ({ data: null }) }))
jest.mock('@/components/museum-search', () => () => <div>MuseumSearch</div>)
jest.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }))

describe('SeenModal', () => {
  it('toont titel van het kunstwerk', () => {
    render(
      <SeenModal
        artworkId={1}
        artworkTitle="Colorful Life"
        open={true}
        onOpenChange={jest.fn()}
        onSaved={jest.fn()}
      />
    )
    expect(screen.getByText('Colorful Life')).toBeInTheDocument()
    expect(screen.getByText('Markeer als gezien')).toBeInTheDocument()
  })
})
```

```bash
npx jest __tests__/components/seen-modal.test.tsx
```

Verwacht: 1 test passed.

- [ ] **Stap 5: Commit**

```bash
git add -A
git commit -m "feat: SeenModal — datum, locatie typeahead, sterren, notitie"
```

---

## Task 11: Artwork Grid + Artwork Card

**Files:**
- Create: `components/artwork-card.tsx`
- Create: `components/artwork-grid.tsx`

- [ ] **Stap 1: ArtworkCard**

Maak `components/artwork-card.tsx`:

```typescript
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import SeenModal from '@/components/seen-modal'

interface Artwork {
  id: number
  title: string
  year_start?: number | null
  type_normalized?: string | null
  image_local_path?: string | null
  image_url?: string | null
  museum?: { name: string; city: string } | null
}

interface ArtworkCardProps {
  artwork: Artwork
  seen?: { id: number; dateSeen: string; locationSeen?: string | null; notes?: string | null; rating?: number | null } | null
  onSeenChange: () => void
  isLoggedIn: boolean
}

export default function ArtworkCard({ artwork, seen, onSeenChange, isLoggedIn }: ArtworkCardProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const imgSrc = artwork.image_local_path ?? artwork.image_url ?? '/placeholder.jpg'

  return (
    <>
      <div className="relative group rounded-lg overflow-hidden bg-slate-800 aspect-square">
        <Link href={`/artworks/${artwork.id}`}>
          <img
            src={imgSrc}
            alt={artwork.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </Link>

        {/* Gezien overlay */}
        {seen && (
          <div className="absolute top-1.5 right-1.5 bg-emerald-500 rounded-full p-0.5">
            <Check size={12} className="text-white" />
          </div>
        )}

        {/* Hover overlay */}
        {isLoggedIn && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
            <button
              onClick={() => setModalOpen(true)}
              className="text-xs text-white bg-indigo-600 hover:bg-indigo-500 px-2 py-1 rounded w-full text-center"
            >
              {seen ? 'Bewerken' : 'Markeer gezien'}
            </button>
          </div>
        )}
      </div>

      {isLoggedIn && (
        <SeenModal
          artworkId={artwork.id}
          artworkTitle={artwork.title}
          open={modalOpen}
          onOpenChange={setModalOpen}
          existingSeen={seen}
          onSaved={() => { setModalOpen(false); onSeenChange() }}
        />
      )}
    </>
  )
}
```

- [ ] **Stap 2: ArtworkGrid**

Maak `components/artwork-grid.tsx`:

```typescript
'use client'
import { useState, useCallback } from 'react'
import ArtworkCard from '@/components/artwork-card'
import { Button } from '@/components/ui/button'

interface Artwork {
  id: number
  title: string
  year_start?: number | null
  type_normalized?: string | null
  image_local_path?: string | null
  image_url?: string | null
  museum?: { name: string; city: string } | null
}

interface SeenRecord {
  id: number
  artworkId: number
  dateSeen: string
  locationSeen?: string | null
  notes?: string | null
  rating?: number | null
}

interface ArtworkGridProps {
  artworks: Artwork[]
  seenMap: Record<number, SeenRecord>
  isLoggedIn: boolean
  onRefresh: () => void
}

const TYPES = ['Alle types', 'painting', 'drawing', 'print', 'work on paper', 'other']

export default function ArtworkGrid({ artworks, seenMap, isLoggedIn, onRefresh }: ArtworkGridProps) {
  const [filterType, setFilterType] = useState('Alle types')
  const [filterSeen, setFilterSeen] = useState<'all' | 'seen' | 'unseen'>('all')

  const filtered = artworks.filter((a) => {
    if (filterType !== 'Alle types' && a.type_normalized !== filterType) return false
    if (filterSeen === 'seen' && !seenMap[a.id]) return false
    if (filterSeen === 'unseen' && seenMap[a.id]) return false
    return true
  })

  return (
    <div>
      {/* Filterbalk */}
      <div className="flex flex-wrap gap-2 mb-4">
        {TYPES.map((t) => (
          <Button
            key={t}
            size="sm"
            variant={filterType === t ? 'default' : 'outline'}
            onClick={() => setFilterType(t)}
            className="text-xs"
          >
            {t}
          </Button>
        ))}
        <div className="ml-auto flex gap-2">
          {(['all', 'seen', 'unseen'] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filterSeen === f ? 'default' : 'outline'}
              onClick={() => setFilterSeen(f)}
              className="text-xs"
            >
              {f === 'all' ? 'Alle' : f === 'seen' ? 'Gezien' : 'Niet gezien'}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        {filtered.map((artwork) => (
          <ArtworkCard
            key={artwork.id}
            artwork={artwork}
            seen={seenMap[artwork.id] ?? null}
            onSeenChange={onRefresh}
            isLoggedIn={isLoggedIn}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-slate-400 text-center py-12">Geen werken gevonden met deze filters.</p>
      )}
    </div>
  )
}
```

- [ ] **Stap 3: Commit**

```bash
git add -A
git commit -m "feat: ArtworkCard + ArtworkGrid met filters"
```

---

## Task 12: Artist detail pagina

**Files:**
- Create: `app/artists/[slug]/page.tsx`
- Create: `app/artists/[slug]/artist-detail-client.tsx`

- [ ] **Stap 1: Server component**

Maak `app/artists/[slug]/page.tsx`:

```typescript
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import ArtistDetailClient from './artist-detail-client'

export default async function ArtistDetailPage({
  params,
}: {
  params: { slug: string }
}) {
  const session = await getServerSession(authOptions)

  const artist = await prisma.artist.findUnique({
    where: { slug: params.slug },
    include: {
      artworks: {
        include: { museum: true },
        orderBy: [{ year_start: 'asc' }, { title: 'asc' }],
      },
    },
  })

  if (!artist) notFound()

  const seenRecords = session?.user?.id
    ? await prisma.seen.findMany({
        where: {
          userId: session.user.id,
          artwork: { artistId: artist.id },
        },
      })
    : []

  const seenMap = Object.fromEntries(seenRecords.map((s) => [s.artworkId, s]))

  return (
    <ArtistDetailClient
      artist={artist}
      seenMap={seenMap as any}
      isLoggedIn={!!session?.user}
    />
  )
}
```

- [ ] **Stap 2: Client component**

Maak `app/artists/[slug]/artist-detail-client.tsx`:

```typescript
'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ProgressBar from '@/components/progress-bar'
import ArtworkGrid from '@/components/artwork-grid'

interface Artist {
  id: number
  name: string
  slug: string
  birth_year?: number | null
  death_year?: number | null
  nationality?: string | null
  bio?: string | null
  portrait_url?: string | null
  artworks: any[]
}

interface ArtistDetailClientProps {
  artist: Artist
  seenMap: Record<number, any>
  isLoggedIn: boolean
}

export default function ArtistDetailClient({ artist, seenMap: initialSeenMap, isLoggedIn }: ArtistDetailClientProps) {
  const router = useRouter()
  const [seenMap, setSeenMap] = useState(initialSeenMap)

  const seenCount = Object.keys(seenMap).length
  const total = artist.artworks.length
  const pct = total > 0 ? (seenCount / total) * 100 : 0

  async function refresh() {
    // Herlaad seen data via API
    const res = await fetch('/api/seen')
    if (res.ok) {
      const all = await res.json()
      const map: Record<number, any> = {}
      for (const s of all) {
        if (artist.artworks.some((a) => a.id === s.artworkId)) {
          map[s.artworkId] = s
        }
      }
      setSeenMap(map)
    }
  }

  return (
    <div>
      {/* Hero banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 mb-8">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
            {artist.portrait_url ? (
              <img src={artist.portrait_url} alt={artist.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-slate-400">
                {artist.name[0]}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white mb-1">{artist.name}</h1>
            <p className="text-slate-400 text-sm mb-3">
              {[artist.nationality, artist.birth_year && artist.death_year
                ? `${artist.birth_year}–${artist.death_year}`
                : artist.birth_year ? `geb. ${artist.birth_year}` : null
              ].filter(Boolean).join(' · ')}
            </p>
            <ProgressBar
              value={pct}
              seen={seenCount}
              total={total}
              animate={true}
              className="max-w-md"
            />
            {artist.bio && (
              <p className="text-slate-300 text-sm mt-3 leading-relaxed line-clamp-3">{artist.bio}</p>
            )}
          </div>
        </div>
      </div>

      {/* Werkenraster */}
      <ArtworkGrid
        artworks={artist.artworks}
        seenMap={seenMap}
        isLoggedIn={isLoggedIn}
        onRefresh={refresh}
      />
    </div>
  )
}
```

- [ ] **Stap 3: Commit**

```bash
git add -A
git commit -m "feat: /artists/[slug] — hero banner + werkenraster"
```

---

## Task 13: Artwork detail pagina

**Files:**
- Create: `app/artworks/[id]/page.tsx`
- Create: `app/artworks/[id]/artwork-detail-client.tsx`

- [ ] **Stap 1: Server component**

Maak `app/artworks/[id]/page.tsx`:

```typescript
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import ArtworkDetailClient from './artwork-detail-client'

export default async function ArtworkDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  const artwork = await prisma.artwork.findUnique({
    where: { id: parseInt(params.id) },
    include: {
      artist: true,
      museum: true,
      _count: {
        select: {
          seenBy: { where: { user: { seenPublic: true } } },
        },
      },
    },
  })

  if (!artwork) notFound()

  const seen = session?.user?.id
    ? await prisma.seen.findUnique({
        where: { userId_artworkId: { userId: session.user.id, artworkId: artwork.id } },
      })
    : null

  return (
    <ArtworkDetailClient
      artwork={artwork as any}
      initialSeen={seen as any}
      seenCount={artwork._count.seenBy}
      isLoggedIn={!!session?.user}
    />
  )
}
```

- [ ] **Stap 2: Client component**

Maak `app/artworks/[id]/artwork-detail-client.tsx`:

```typescript
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'
import Lightbox from '@/components/lightbox'
import SeenModal from '@/components/seen-modal'
import ShareMenu from '@/components/share-menu'

interface ArtworkDetailClientProps {
  artwork: {
    id: number
    title: string
    year_start?: number | null
    year_end?: number | null
    medium_raw?: string | null
    type_normalized?: string | null
    dimensions_raw?: string | null
    image_local_path?: string | null
    image_url?: string | null
    artist: { id: number; name: string; slug: string }
    museum?: { name: string; city: string; country: string } | null
  }
  initialSeen: any | null
  seenCount: number
  isLoggedIn: boolean
}

export default function ArtworkDetailClient({
  artwork,
  initialSeen,
  seenCount,
  isLoggedIn,
}: ArtworkDetailClientProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [seen, setSeen] = useState(initialSeen)
  const [currentSeenCount, setCurrentSeenCount] = useState(seenCount)

  const imgSrc = artwork.image_local_path ?? artwork.image_url ?? '/placeholder.jpg'
  const yearLabel = artwork.year_end && artwork.year_end !== artwork.year_start
    ? `${artwork.year_start}–${artwork.year_end}`
    : artwork.year_start?.toString() ?? 'Onbekend'

  async function handleSaved() {
    const res = await fetch('/api/seen')
    if (res.ok) {
      const all = await res.json()
      const updated = all.find((s: any) => s.artworkId === artwork.id)
      setSeen(updated ?? null)
      if (!seen && updated) setCurrentSeenCount((c) => c + 1)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href={`/artists/${artwork.artist.slug}`}
        className="inline-flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-4"
      >
        <ArrowLeft size={14} /> Terug naar {artwork.artist.name}
      </Link>

      {/* Afbeelding */}
      <div
        className="rounded-xl overflow-hidden bg-slate-900 mb-6 cursor-zoom-in"
        onClick={() => setLightboxOpen(true)}
      >
        <img
          src={imgSrc}
          alt={artwork.title}
          className="w-full object-contain max-h-[60vh]"
        />
      </div>

      {lightboxOpen && (
        <Lightbox src={imgSrc} alt={artwork.title} onClose={() => setLightboxOpen(false)} />
      )}

      {/* Titel + jaar */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white">{artwork.title}</h1>
        <p className="text-slate-400 mt-1">
          {artwork.artist.name} · {yearLabel}
        </p>
      </div>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { label: 'Type', value: artwork.type_normalized },
          { label: 'Medium', value: artwork.medium_raw },
          { label: 'Afmetingen', value: artwork.dimensions_raw },
          { label: 'Museum', value: artwork.museum?.name },
          { label: 'Stad', value: artwork.museum ? `${artwork.museum.city}, ${artwork.museum.country}` : null },
        ]
          .filter((item) => item.value)
          .map(({ label, value }) => (
            <div key={label} className="bg-slate-900 rounded-lg p-3">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">{label}</p>
              <p className="text-white text-sm">{value}</p>
            </div>
          ))}
      </div>

      {/* Gezien-sectie */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <Button
              onClick={() => setModalOpen(true)}
              variant={seen ? 'outline' : 'default'}
              className={seen ? 'gap-2 border-emerald-600 text-emerald-400' : 'gap-2'}
            >
              {seen && <Check size={15} />}
              {seen ? 'Gezien · Bewerken' : 'Markeer als gezien'}
            </Button>
          ) : (
            <Link href="/login">
              <Button variant="outline">Inloggen om te markeren</Button>
            </Link>
          )}
          <span className="text-slate-400 text-sm">
            {currentSeenCount} {currentSeenCount === 1 ? 'persoon heeft' : 'mensen hebben'} dit gezien
          </span>
        </div>
        <ShareMenu url={`/artworks/${artwork.id}`} title={`${artwork.title} — ${artwork.artist.name}`} />
      </div>

      <SeenModal
        artworkId={artwork.id}
        artworkTitle={artwork.title}
        open={modalOpen}
        onOpenChange={setModalOpen}
        existingSeen={seen}
        onSaved={handleSaved}
      />
    </div>
  )
}
```

- [ ] **Stap 3: Commit**

```bash
git add -A
git commit -m "feat: /artworks/[id] — detail, lightbox, gezien-knop, delen"
```

---

## Task 14: Dashboard pagina

**Files:**
- Create: `app/page.tsx`

- [ ] **Stap 1: Dashboard**

Maak `app/page.tsx`:

```typescript
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import ProgressBar from '@/components/progress-bar'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  const artists = await prisma.artist.findMany({
    include: { _count: { select: { artworks: true } } },
    orderBy: { name: 'asc' },
  })

  const seenCounts: Record<number, number> = {}
  const recentSeen: any[] = []

  if (session?.user?.id) {
    for (const artist of artists) {
      seenCounts[artist.id] = await prisma.seen.count({
        where: { userId: session.user.id, artwork: { artistId: artist.id } },
      })
    }
    const recent = await prisma.seen.findMany({
      where: { userId: session.user.id },
      include: { artwork: { include: { artist: true } } },
      orderBy: { createdAt: 'desc' },
      take: 6,
    })
    recentSeen.push(...recent)
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          {session?.user?.name ? `Hallo, ${session.user.name.split(' ')[0]}` : 'ArtTracker'}
        </h1>
        <p className="text-slate-400">
          {session ? 'Jouw kunstvoortgang in één oogopslag.' : 'Log in om je voortgang bij te houden.'}
        </p>
      </div>

      {/* Kunstenaars voortgang */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Kunstenaars</h2>
          <Link href="/artists">
            <Button variant="ghost" size="sm" className="text-slate-400">Alle kunstenaars →</Button>
          </Link>
        </div>
        <div className="space-y-3">
          {artists.map((artist) => {
            const seen = seenCounts[artist.id] ?? 0
            const total = artist._count.artworks
            const pct = total > 0 ? (seen / total) * 100 : 0
            return (
              <Link key={artist.id} href={`/artists/${artist.slug}`} className="block bg-slate-900 rounded-xl p-4 hover:bg-slate-800 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{artist.name}</span>
                  <span className="text-slate-400 text-sm">{seen}/{total}</span>
                </div>
                <ProgressBar value={pct} seen={seen} total={total} animate={false} />
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent gezien */}
      {recentSeen.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent gezien</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {recentSeen.map((s) => (
              <Link key={s.id} href={`/artworks/${s.artworkId}`} className="group">
                <div className="aspect-square rounded-lg overflow-hidden bg-slate-800">
                  <img
                    src={s.artwork.image_local_path ?? s.artwork.image_url ?? '/placeholder.jpg'}
                    alt={s.artwork.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1 truncate">{s.artwork.title}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!session && (
        <div className="text-center py-12 border border-slate-800 rounded-xl">
          <p className="text-slate-400 mb-4">Log in om je voortgang bij te houden.</p>
          <Link href="/login"><Button>Inloggen of registreren</Button></Link>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Stap 2: Commit**

```bash
git add -A
git commit -m "feat: dashboard — voortgang per kunstenaar + recent gezien"
```

---

## Task 15: Discover pagina

**Files:**
- Create: `app/discover/page.tsx`
- Create: `components/discover-screen.tsx`

- [ ] **Stap 1: Discover client component**

Maak `components/discover-screen.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'

const SCREENS = [
  [
    { slug: 'vangogh',      name: 'Van Gogh' },
    { slug: 'picasso',      name: 'Picasso' },
    { slug: 'davinci',      name: 'Da Vinci' },
    { slug: 'monet',        name: 'Monet' },
    { slug: 'rembrandt',    name: 'Rembrandt' },
    { slug: 'dali',         name: 'Dalí' },
    { slug: 'kahlo',        name: 'Frida Kahlo' },
    { slug: 'vermeer',      name: 'Vermeer' },
    { slug: 'michelangelo', name: 'Michelangelo' },
    { slug: 'matisse',      name: 'Matisse' },
    { slug: 'klimt',        name: 'Klimt' },
    { slug: 'munch',        name: 'Munch' },
  ],
  [
    { slug: 'raphael',    name: 'Raphael' },
    { slug: 'botticelli', name: 'Botticelli' },
    { slug: 'caravaggio', name: 'Caravaggio' },
    { slug: 'goya',       name: 'Goya' },
    { slug: 'renoir',     name: 'Renoir' },
    { slug: 'degas',      name: 'Degas' },
    { slug: 'cezanne',    name: 'Cézanne' },
    { slug: 'manet',      name: 'Manet' },
    { slug: 'gauguin',    name: 'Gauguin' },
    { slug: 'mondrian',   name: 'Mondrian' },
    { slug: 'chagall',    name: 'Chagall' },
    { slug: 'pollock',    name: 'Pollock' },
  ],
  [
    { slug: 'warhol',    name: 'Andy Warhol' },
    { slug: 'rothko',    name: 'Rothko' },
    { slug: 'basquiat',  name: 'Basquiat' },
    { slug: 'klee',      name: 'Klee' },
    { slug: 'miro',      name: 'Miró' },
    { slug: 'magritte',  name: 'Magritte' },
    { slug: 'okeeffe',   name: "O'Keeffe" },
    { slug: 'schiele',   name: 'Schiele' },
    { slug: 'bosch',     name: 'Bosch' },
    { slug: 'vaneyck',   name: 'Jan van Eyck' },
    { slug: 'kandinsky', name: 'Kandinsky' },
  ],
]

export default function DiscoverScreen({ initialVotes }: { initialVotes: string[] }) {
  const router = useRouter()
  const [screen, setScreen] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set(initialVotes))
  const [saving, setSaving] = useState(false)

  function toggle(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  async function handleFinish() {
    setSaving(true)
    await fetch('/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artistNames: Array.from(selected) }),
    })
    setSaving(false)
    router.push('/')
  }

  const artists = SCREENS[screen]
  const isLast = screen === SCREENS.length - 1

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Welke kunstenaars wil jij in de app?</h1>
        <p className="text-slate-400 text-sm">Klik op kunstenaars die je interessant vindt. We voegen de populairste als eerste toe.</p>
      </div>

      {/* Voortgang dots */}
      <div className="flex justify-center gap-2 mb-6">
        {SCREENS.map((_, i) => (
          <button
            key={i}
            onClick={() => setScreen(i)}
            className={`rounded-full transition-all ${i === screen ? 'w-7 h-2 bg-indigo-500' : 'w-2 h-2 bg-slate-700'}`}
          />
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-8">
        {artists.map(({ slug, name }) => {
          const isSelected = selected.has(slug)
          return (
            <button
              key={slug}
              onClick={() => toggle(slug)}
              className={`rounded-xl overflow-hidden border-2 transition-all ${isSelected ? 'border-indigo-500 shadow-lg shadow-indigo-900/30' : 'border-transparent'}`}
            >
              <div className="aspect-square bg-slate-800 relative">
                <img
                  src={`/images/discover/${slug}.jpg`}
                  alt={name}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
                    <div className="bg-indigo-500 rounded-full p-1">
                      <Check size={14} className="text-white" />
                    </div>
                  </div>
                )}
              </div>
              <div className={`py-2 px-1 text-center text-xs font-medium bg-slate-900 ${isSelected ? 'text-indigo-300' : 'text-slate-300'}`}>
                {name}
              </div>
            </button>
          )
        })}
      </div>

      {/* Navigatie */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          disabled={screen === 0}
          onClick={() => setScreen((s) => s - 1)}
          className="border-slate-700"
        >
          ← Vorige
        </Button>
        <span className="text-slate-400 text-sm">{selected.size} geselecteerd</span>
        {isLast ? (
          <Button onClick={handleFinish} disabled={saving}>
            {saving ? 'Opslaan...' : 'Opslaan ✓'}
          </Button>
        ) : (
          <Button onClick={() => setScreen((s) => s + 1)}>
            Volgende →
          </Button>
        )}
      </div>

      <p
        className="text-center text-slate-500 text-sm mt-4 cursor-pointer hover:text-slate-300"
        onClick={() => router.push('/')}
      >
        Sla over
      </p>
    </div>
  )
}
```

- [ ] **Stap 2: Discover server page**

Maak `app/discover/page.tsx`:

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import DiscoverScreen from '@/components/discover-screen'

export default async function DiscoverPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const votes = await prisma.artistVote.findMany({
    where: { userId: session.user.id },
    select: { artistName: true },
  })

  return <DiscoverScreen initialVotes={votes.map((v) => v.artistName)} />
}
```

- [ ] **Stap 3: Commit**

```bash
git add -A
git commit -m "feat: /discover — kunstenaars-keuzescherm met stemmen"
```

---

## Task 16: Profile + Admin pagina's

**Files:**
- Create: `app/profile/page.tsx`
- Create: `app/admin/page.tsx`
- Create: `app/admin/import-client.tsx`

- [ ] **Stap 1: Profile pagina**

Maak `app/profile/page.tsx`:

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ProfileClient from './profile-client'

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, seenPublic: true, createdAt: true },
  })

  const seenCount = await prisma.seen.count({ where: { userId: session.user.id } })
  const hasPassword = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  }).then((u) => !!u?.password)

  return <ProfileClient user={user!} seenCount={seenCount} hasPassword={hasPassword} />
}
```

Maak `app/profile/profile-client.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'

interface ProfileClientProps {
  user: { id: string; name?: string | null; email: string; image?: string | null; seenPublic: boolean; createdAt: Date }
  seenCount: number
  hasPassword: boolean
}

export default function ProfileClient({ user, seenCount, hasPassword }: ProfileClientProps) {
  const { toast } = useToast()
  const [name, setName] = useState(user.name ?? '')
  const [seenPublic, setSeenPublic] = useState(user.seenPublic)
  const [saving, setSaving] = useState(false)

  async function saveProfile() {
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, seenPublic }),
    })
    setSaving(false)
    if (res.ok) toast({ description: 'Profiel opgeslagen' })
    else toast({ description: 'Er ging iets mis', variant: 'destructive' })
  }

  return (
    <div className="max-w-md space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Profiel</h1>
        <p className="text-slate-400 text-sm">{seenCount} werken gezien</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs text-slate-400 uppercase tracking-wide">Naam</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-slate-900 border-slate-700"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-slate-400 uppercase tracking-wide">E-mail</label>
          <Input value={user.email} disabled className="bg-slate-900 border-slate-700 opacity-50" />
        </div>

        <div className="flex items-center justify-between bg-slate-900 rounded-lg p-4">
          <div>
            <p className="text-sm font-medium">Gezien-items openbaar</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Anderen kunnen zien hoeveel mensen een werk hebben gezien
            </p>
          </div>
          <Switch
            checked={seenPublic}
            onCheckedChange={setSeenPublic}
          />
        </div>

        <Button onClick={saveProfile} disabled={saving} className="w-full">
          {saving ? 'Opslaan...' : 'Profiel opslaan'}
        </Button>
      </div>

      <div className="pt-4 border-t border-slate-800">
        <Button
          variant="outline"
          className="w-full border-red-900 text-red-400 hover:bg-red-950"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          Uitloggen
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Stap 2: Voeg Switch toe aan shadcn**

```bash
npx shadcn-ui@latest add switch
```

- [ ] **Stap 3: Profile API route**

Maak `app/api/profile/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { name, seenPublic } = await req.json()

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { name, seenPublic },
    select: { id: true, name: true, seenPublic: true },
  })

  return NextResponse.json(user)
}
```

- [ ] **Stap 4: Admin pagina**

Maak `app/admin/page.tsx`:

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ImportClient from './import-client'

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')
  return <ImportClient />
}
```

Maak `app/admin/import-client.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'

export default function ImportClient() {
  const { toast } = useToast()
  const [jsonData, setJsonData] = useState('')
  const [importing, setImporting] = useState(false)
  const [artistName, setArtistName] = useState('')
  const [artworkTitle, setArtworkTitle] = useState('')
  const [artworkYear, setArtworkYear] = useState('')

  async function handleImport() {
    setImporting(true)
    try {
      const parsed = JSON.parse(jsonData)
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ works: parsed }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ description: `${data.imported} werken geïmporteerd` })
        setJsonData('')
      } else {
        toast({ description: data.error ?? 'Import mislukt', variant: 'destructive' })
      }
    } catch {
      toast({ description: 'Ongeldige JSON', variant: 'destructive' })
    }
    setImporting(false)
  }

  async function handleAddArtwork() {
    if (!artistName || !artworkTitle) return
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        works: [{
          artist: artistName,
          title: artworkTitle,
          year_start: artworkYear ? parseInt(artworkYear) : null,
        }],
      }),
    })
    if (res.ok) {
      toast({ description: 'Werk toegevoegd' })
      setArtworkTitle('')
      setArtworkYear('')
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Beheer</h1>

      <Tabs defaultValue="import">
        <TabsList className="bg-slate-900">
          <TabsTrigger value="import">Scraper import</TabsTrigger>
          <TabsTrigger value="manual">Handmatig toevoegen</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4 pt-4">
          <p className="text-slate-400 text-sm">
            Plak JSON-output van een scraper (array van werken met velden: artist, title, year_start, medium_raw, type_normalized, dimensions_raw, holder_name, holder_city, image_url).
          </p>
          <Textarea
            value={jsonData}
            onChange={(e) => setJsonData(e.target.value)}
            placeholder='[{"artist": "Monet", "title": "Water Lilies", ...}]'
            className="bg-slate-900 border-slate-700 font-mono text-sm"
            rows={10}
          />
          <Button onClick={handleImport} disabled={importing || !jsonData}>
            {importing ? 'Importeren...' : 'Importeer werken'}
          </Button>
        </TabsContent>

        <TabsContent value="manual" className="space-y-4 pt-4">
          <div className="space-y-3">
            <Input
              placeholder="Kunstenaarsnaam"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              className="bg-slate-900 border-slate-700"
            />
            <Input
              placeholder="Titel van het werk"
              value={artworkTitle}
              onChange={(e) => setArtworkTitle(e.target.value)}
              className="bg-slate-900 border-slate-700"
            />
            <Input
              placeholder="Jaar (optioneel)"
              type="number"
              value={artworkYear}
              onChange={(e) => setArtworkYear(e.target.value)}
              className="bg-slate-900 border-slate-700"
            />
            <Button onClick={handleAddArtwork} disabled={!artistName || !artworkTitle}>
              Werk toevoegen
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

- [ ] **Stap 5: Import API route**

Maak `app/api/import/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/utils'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { works } = await req.json()
  if (!Array.isArray(works)) return NextResponse.json({ error: 'works moet een array zijn' }, { status: 400 })

  let imported = 0

  for (const work of works) {
    if (!work.artist || !work.title) continue

    // Zorg dat kunstenaar bestaat
    let artist = await prisma.artist.findFirst({ where: { name: work.artist } })
    if (!artist) {
      artist = await prisma.artist.create({
        data: { name: work.artist, slug: slugify(work.artist) },
      })
    }

    // Museum
    let museumId: number | undefined
    if (work.holder_name && work.holder_city) {
      let museum = await prisma.museum.findFirst({
        where: { name: work.holder_name, city: work.holder_city },
      })
      if (!museum) {
        museum = await prisma.museum.create({
          data: { name: work.holder_name, city: work.holder_city, country: work.holder_country ?? 'Onbekend' },
        })
      }
      museumId = museum.id
    }

    // Artwork (sla over als al bestaat)
    const existing = await prisma.artwork.findFirst({
      where: { artistId: artist.id, title: work.title },
    })
    if (existing) continue

    await prisma.artwork.create({
      data: {
        artistId: artist.id,
        museumId,
        title: work.title,
        year_start: work.year_start ?? null,
        year_end: work.year_end ?? null,
        medium_raw: work.medium_raw ?? null,
        type_normalized: work.type_normalized ?? null,
        dimensions_raw: work.dimensions_raw ?? null,
        image_url: work.image_url ?? null,
        source_url: work.source_url ?? null,
      },
    })
    imported++
  }

  return NextResponse.json({ imported })
}
```

- [ ] **Stap 6: Voeg Toaster toe aan layout**

Voeg toe aan `app/layout.tsx` (in de body, na `<main>`):

```typescript
import { Toaster } from '@/components/ui/toaster'
// ...
<Toaster />
```

- [ ] **Stap 7: Commit**

```bash
git add -A
git commit -m "feat: /profile + /admin — instellingen, import, handmatig toevoegen"
```

---

## Task 17: Eindcheck + opruimen

- [ ] **Stap 1: Draai alle tests**

```bash
npx jest --passWithNoTests
```

Verwacht: alle tests groen.

- [ ] **Stap 2: Build check**

```bash
npm run build
```

Verwacht: geen TypeScript-fouten, geen build-errors.

- [ ] **Stap 3: Voeg .gitignore entries toe**

Zorg dat `.gitignore` bevat:

```
.env.local
prisma/dev.db
prisma/dev.db-journal
.superpowers/
public/images/artworks/
```

- [ ] **Stap 4: Draai seed opnieuw en test volledig handmatig**

```bash
npm run dev
```

Doorloop handmatig:
1. Ga naar http://localhost:3000 — dashboard zichtbaar
2. Ga naar http://localhost:3000/login — maak account aan
3. Ga naar http://localhost:3000/discover — selecteer kunstenaars, sla op
4. Ga naar http://localhost:3000/artists — Kandinsky zichtbaar met voortgangsbalk
5. Klik op Kandinsky — hero banner + werkenraster
6. Klik op een werk — detail pagina, markeer als gezien
7. Ga terug naar kunstenaar — voortgangsbalk bijgewerkt
8. Ga naar http://localhost:3000/profile — instellingen aanpassen

- [ ] **Stap 5: Final commit**

```bash
git add -A
git commit -m "feat: ArtTracker v1 — volledig werkende app"
```

---

## Snel-referentie: nuttige commando's

```bash
# Dev server
npm run dev

# Database bekijken
npx prisma studio

# Database resetten en opnieuw seeden
npx prisma migrate reset

# Seed uitvoeren
npx prisma db seed

# Alle tests
npx jest

# Build
npm run build
```
