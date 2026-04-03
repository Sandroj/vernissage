# ArtTracker — Design Spec

**Datum:** 2026-04-03
**Status:** Goedgekeurd

---

## Overzicht

ArtTracker is een webapp waarmee gebruikers kunnen bijhouden welke kunstwerken van welke kunstenaars ze ooit hebben gezien. Startpunt is de volledige catalogus van Wassily Kandinsky (616 werken, al beschikbaar als SQLite-database). Daarna worden meer kunstenaars toegevoegd via scraper-import of handmatige invoer.

De app ondersteunt meerdere gebruikers met eigen accounts en eigen "gezien"-lijsten, met een optie om voortgang te delen.

---

## Tech Stack

| Onderdeel | Keuze |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | SQLite lokaal via Prisma ORM |
| Auth | NextAuth.js — Google + e-mail/wachtwoord |
| Afbeeldingen | Lokaal opgeslagen (al aanwezig via scraper) |
| Deployment (later) | Vercel + PostgreSQL (Neon of PlanetScale) |

Lokaal draaien via `npm run dev` zonder externe services.

Projectlocatie: `~/claude-code/projects/art/arttracker/`

---

## Data Model

### Artist
```
id            Int       @id @default(autoincrement())
name          String
slug          String    @unique
birth_year    Int?
death_year    Int?
nationality   String?
bio           String?
portrait_url  String?
createdAt     DateTime  @default(now())
artworks      Artwork[]
```

### Museum
```
id        Int       @id @default(autoincrement())
name      String
city      String
country   String
website   String?
artworks  Artwork[]
```

### Artwork
```
id              Int      @id @default(autoincrement())
artistId        Int
museumId        Int?
title           String
year_start      Int?
year_end        Int?
medium_raw      String?
type_normalized String?
dimensions_raw  String?
image_url       String?
image_local_path String?
source_url      String?
artist          Artist   @relation(...)
museum          Museum?  @relation(...)
seenBy          Seen[]
```

### User
```
id         String   @id @default(cuid())
name       String?
email      String   @unique
image      String?
seenPublic Boolean  @default(true)   -- accountinstelling: publiek of privé
accounts   Account[]
sessions   Session[]
seen       Seen[]
```

### Seen
```
id           Int      @id @default(autoincrement())
userId       String
artworkId    Int
dateSeen     DateTime
locationSeen String?  -- vrije tekst of museumnaam uit typeahead
notes        String?
rating       Int?     -- 1–5
photo_url    String?
createdAt    DateTime @default(now())
user         User     @relation(...)
artwork      Artwork  @relation(...)

@@unique([userId, artworkId])
```

### ArtistVote
```
id        Int      @id @default(autoincrement())
userId    String
artistName String  -- naam van de gewenste kunstenaar (nog niet in app)
createdAt DateTime @default(now())
user      User     @relation(...)

@@unique([userId, artistName])
```

---

## Pagina's

| Route | Inhoud |
|---|---|
| `/` | Dashboard: voortgang per kunstenaar, recentste "gezien"-items |
| `/artists` | Overzicht van alle kunstenaars met zoekbalk en voortgangsbalken |
| `/artists/[slug]` | Kunstenaar-detailpagina (zie layout hieronder) |
| `/artworks/[id]` | Artwork-detailpagina (zie layout hieronder) |
| `/discover` | Kunstenaars-keuzescherm: stem op kunstenaars die je in de app wilt |
| `/profile` | Eigen gezien-lijst, statistieken, accountinstellingen |
| `/admin` | Kunstenaar toevoegen, scraper-output importeren, handmatige invoer |
| `/login` | Inloggen via Google of e-mail/wachtwoord |

---

## Layouts

### Artistenpagina (`/artists`)

- Zoekbalk bovenaan — zoek op naam, nationaliteit of periode
- Lijst/raster van kunstenaars die in de app staan, elk met:
  - Portretfoto
  - Naam
  - Voortgangsbalk: X van Y gezien
- Klikken opent de kunstenaar-detailpagina

### Kunstenaar-detailpagina (`/artists/[slug]`)

**Hero-banner bovenaan** (volle breedte):
- Portretfoto kunstenaar
- Naam, nationaliteit, geboorte–overlijdensjaar
- Voortgangsbalk: X van Y werken gezien (animatie bij update)
- Korte bio

**Werkenraster eronder:**
- Miniaturen in een grid
- Gezien-status als groen overlay op de miniatuur
- Filterbalk: type werk, gezien/niet-gezien, stad
- Klikken op een werk opent de artwork-detailpagina

### Artwork-detailpagina (`/artworks/[id]`)

**Opbouw (verticaal):**
1. Terug-link naar kunstenaar
2. Grote afbeelding — klikbaar voor lightbox (alleen afbeelding, geen UI)
3. Titel + kunstenaar + jaar
4. Metadata-grid: type, medium, afmetingen, museum, stad
5. "Markeer als gezien"-knop (of "Bewerken" als al gezien)
6. Teller: "X mensen hebben dit werk gezien"
7. Deelknop: kopieer link / Twitter-X / Instagram / e-mail

### Kunstenaars-keuzescherm (`/discover`)

Doel: gebruikers laten aangeven welke kunstenaars ze graag in de app willen zien. Resultaten worden opgeslagen als stemmen voor toekomstige toevoeging.

**Opbouw:**
- 3 schermen van elk 9 of 12 kunstenaars (totaal 27–36)
- Navigatie via pijltjes links/rechts
- Voortgangsindicator: "Pagina 1 van 3"
- Per kunstenaar: een afbeelding van een bekend werk + naam eronder
- Klikken = selecteren (toggle), visueel duidelijk (border/overlay)
- Onderaan: "Volgende" of "Sla op" knop

**Kunstenaarslijst (36 bekendste):**
Verdeeld over 3 schermen van 12:

*Scherm 1:* Van Gogh, Picasso, Da Vinci, Monet, Rembrandt, Dalí, Frida Kahlo, Vermeer, Michelangelo, Matisse, Klimt, Munch
*Scherm 2:* Raphael, Botticelli, Caravaggio, Goya, Renoir, Degas, Cézanne, Manet, Gauguin, Mondrian, Chagall, Pollock
*Scherm 3:* Andy Warhol, Rothko, Basquiat, Klee, Miró, Magritte, O'Keeffe, Schiele, Bosch, Jan van Eyck, Kandinsky

**Afbeeldingen:** al gedownload van Art Institute of Chicago open API (publiek domein) en Wikimedia Commons, opgeslagen in `public/images/discover/`. Download-script: `scripts/download_discover_images.py`.

**Onboarding:** na aanmaken account wordt `/discover` getoond met de optie om te skippen. Later altijd bereikbaar via navigatie.

---

## "Gezien markeren" — Modal

Opent via shadcn `Dialog` na klikken op de knop. Velden:

- **Datum** — `Calendar` + `Popover`, standaard vandaag
- **Locatie** — `Command`-typeahead op museumnamen uit de database, fallback: vrije tekstinvoer
- **Notitie** — `Textarea`, vrij veld
- **Waardering** — 1–5 sterren
- **Foto** — optionele upload

Na opslaan:
- Modal sluit
- Werk krijgt groen vinkje in het raster
- Voortgangsbalk kunstenaar speelt korte animatie af (teller telt op)

---

## Accountinstellingen (`/profile`)

- Weergavenaam en avatar
- Zichtbaarheid: toggle publiek/privé — geldt voor alle "gezien"-registraties van dit account
- Wachtwoord wijzigen (bij e-mailauthenticatie)
- Uitloggen

---

## Auth

- Inloggen via Google of e-mail/wachtwoord (NextAuth.js)
- Na inloggen → redirect naar dashboard of `/discover` (bij nieuw account)
- Uitloggen via knop in navigatie (altijd zichtbaar)

---

## Kunstenaars toevoegen (`/admin`)

Twee methoden:
1. **Scraper-import** — upload JSON/CSV-output van een scraper (zelfde formaat als de Kandinsky-scraper). Systeem valideert en importeert in Prisma
2. **Handmatig formulier** — invoerformulier voor kunstenaar + losse werken

---

## Data Import

Bij eerste setup draait een seed-script dat de bestaande Kandinsky SQLite (`kandinsky_full/data/kandinsky_works.sqlite`, 616 werken) inlaadt in de Prisma-database. Musea worden gededupliceerd en opgeslagen in de `Museum`-tabel.

Bronbestand: `~/claude-code/projects/art/sources/kandinsky_scraper_bundle/kandinsky_full/data/kandinsky_works.sqlite`

**Afbeeldingen:** De scraped afbeeldingen staan in `kandinsky_full/images/`. Het seed-script kopieert deze naar `public/images/artworks/` in het Next.js-project zodat ze via `/images/artworks/work-1.jpg` bereikbaar zijn. Het `image_local_path`-veld in `Artwork` slaat dit publieke pad op.

---

## Delen

Op de artwork-detailpagina een `DropdownMenu` (shadcn) met:
- Kopieer link (URL naar `/artworks/[id]`)
- Deel op Twitter/X
- Deel op Instagram (download voor Stories of link naar bio)
- Deel via e-mail (mailto-link)

---

## Responsive design

De app is volledig responsive en bruikbaar op mobiel, tablet en desktop.

| Breakpoint | Gedrag |
|---|---|
| Mobile (< 640px) | Navigatie als hamburgermenu, werkenraster 2 kolommen, artwork-detail verticaal stapelend, discover-scherm 2×6 raster |
| Tablet (640–1024px) | Sidebar inklapbaar, raster 3–4 kolommen |
| Desktop (> 1024px) | Volledige sidebar zichtbaar, raster 4–6 kolommen |

Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) voor alle layouts. shadcn/ui componenten zijn zelf al mobile-first.

---

## Buiten scope (v1)

- Native app (React Native) — later
- Cloud deployment — later, na lokale werking
- Geavanceerde statistieken per gebruiker (kaarten, tijdlijnen)
- Sociale features (volgers, comments)
- Afbeeldingsrechten-management
