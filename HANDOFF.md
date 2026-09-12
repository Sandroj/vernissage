# HANDOFF — Vernissage

> Levend statusbestand. Elke AI werkt dit bij vóór het stoppen, zodat de
> volgende (Claude, Codex of Antigravity) naadloos verder kan. Kort en concreet:
> paden, commando's, exacte namen. Geen secrets — verwijs naar env-vars.

## Waar staan we
Next.js-app (App Router) voor het bijhouden van kunst: artiesten, kunstwerken en
musea, met discover-, profiel- en admin-secties. Draait live op Vercel. Van Gogh
Worldwide/De la Faille is het primaire Van Gogh-register: 2.135 zichtbare
F-records, 883 schilderijen en 2.048 werken met beeld. `main` is schoon en gelijk
aan `origin/main`. Deze repo is nu Orca-klaar gemaakt: richt
Orca/agents op **deze map** (`projects/art/arttracker/`), niet op de buitenste
`art/`-map.

## Stack en deploy
- **Framework:** Next.js (App Router), TypeScript, Tailwind + shadcn/ui.
- **Database:** Prisma met Turso (libSQL/sqlite). Lokaal `dev.db` (gitignored).
- **Auth:** NextAuth — Google OAuth + credentials (wachtwoord vergeten werkt).
- **Afbeeldingen:** Cloudflare R2 (artwork-uploads, gitignored onder
  `public/images/artworks/`).
- **Hosting:** Vercel (`npm run build` = `prisma generate && next build`).
- **Env-vars** (zie `.env.example`, echte waarden in lokale `.env`/`.env.local`,
  niet in git): `DATABASE_URL`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`,
  `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
  `R2_ACCOUNT_ID`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`.

## Lokaal draaien
- `npm install` (postinstall draait `prisma generate`).
- `npm run dev` — dev-server.
- `npm run build` — productiebuild (verifieert Prisma + Next).
- `npm run lint` — lint.
- Datamodel: `prisma/schema.prisma` (models o.a. Artist, Artwork, Museum),
  seed via `prisma/seed.ts`.

## Laatst gedaan (2026-09-11)
- Tool-neutrale AI-flow opgezet in de Vernissage-repo zelf (AGENTS.md +
  symlinks CLAUDE.md/GEMINI.md, deze HANDOFF, .gitignore aangevuld).
- Getrackte `.DS_Store`-bestanden uit versiebeheer gehaald (stonden al in
  .gitignore) zodat de diff-weergave schoon is.

## Laatst gedaan (2026-09-12)

- Grondige missing-image-audit uitgevoerd voor alle 233 beeldloze canonieke
  Van Gogh-records. 146 exact geïdentificeerde beelden zijn via VGM, KMM,
  RKD/institutionele IIIF, Commons, Wikidata en VGGallery hersteld. Productie:
  2.048/2.135 met beeld (95,9%); schilderijen 872/883 (98,8%). FVI `A dog`
  gebruikt nu het officiële KMM-beeld voor KM 114.223.
- Afbeeldingsprovenance staat in vier nullable Artwork-velden en is voor alle
  146 nieuwe koppelingen naar Turso gesynchroniseerd. Nieuwe
  `migrate-image-provenance-to-turso.mjs` migreert deze kolommen idempotent;
  `sync-artwork-images-to-turso.mjs` rapporteert nu ook canonieke dekking.
- Alle bestanden en SHA-256's gevalideerd; gedeelde afbeeldingen komen alleen
  voor bij expliciet als zodanig gemarkeerde drukseries. Vier R2-steekproeven
  geven HTTP 200 JPEG; `npm run build` slaagt.

- Commit `0307cee` maakt de complete 2.135-records VGW-snapshot leidend voor
  Van Gogh. Centrale `primaryCatalogue`-filter sluit 990 bewaarde legacyrijen
  zonder F-nummer uit van publieke tellingen, grids, musea en zoeken.
- Beeldloze canonieke records blijven zichtbaar met een placeholder en zijn
  gewoon zoekbaar/markeerbaar. De kunstenaarspagina telt daardoor catalogus-
  records in plaats van alleen afbeeldingen.
- `scripts/sync-vgw-catalogue-to-turso.mjs` synchroniseert alle F-records op
  `catalogue_id`, behoudt bestaande ids/relaties, voegt ontbrekende rijen toe
  en verwijdert niets. Productie: 2.135 canoniek, 990 legacy, 883 paintings,
  1.902 met R2-beeld. Live en lokaal bevestigd; `npm run build` slaagt.

## Volgende stap
1. Houd de 87 resterende beeldloze records periodiek opnieuw tegen de bron aan:
   50 hebben een historische VGW-reproductie maar geen werkende exact
   herleidbare publieke bron; 37 missen ook in de bron bruikbare metadata.
2. Vergelijk de actuele publieke VGW-telling (2.158) met de vaste 2.135
   De la Faille F-snapshot voordat eventuele nieuwe canonieke records worden
   toegevoegd.

## Valkuilen / let op
- **Live op Vercel:** groot werk op een branch, niet direct op `main` pushen.
- Twee geneste repo's: `art/` (buitenste) en deze `arttracker/` (Vernissage). Orca per
  worktree op déze repo richten. Map heet nog `arttracker/` — alleen interne naam is Vernissage.
- Verifieer met `npm run build` (draait `prisma generate` mee) — een kale
  `tsc` checkt hier niet het echte pad.
- Secrets alleen in `.env`/`.env.local` (gitignored) of Vercel env — nooit in
  code of in dit bestand.

## Openstaand / ideeën
- (backlog — nog leeg; vul aan bij het werken)
