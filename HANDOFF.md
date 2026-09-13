# HANDOFF — Vernissage

> Levend statusbestand. Elke AI werkt dit bij vóór het stoppen, zodat de
> volgende (Claude, Codex of Antigravity) naadloos verder kan. Kort en concreet:
> paden, commando's, exacte namen. Geen secrets — verwijs naar env-vars.

## Waar staan we
Next.js-app (App Router) voor het bijhouden van kunst: artiesten, kunstwerken en
musea, met discover-, profiel- en admin-secties. Draait live op Vercel. Van Gogh
Worldwide/De la Faille is het primaire Van Gogh-register: 2.135 zichtbare
F-records, 883 schilderijen en 2.048 werken met beeld. Kandinsky staat op
892/952 met beeld; Vermeer is compleet op 37/37. `main` is schoon en gelijk
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

## Laatst gedaan (2026-09-13, UX/auth/museumronde)

- Homepage-hero toont nu per carrouselstap drie klikbare werken (één groot +
  twee gestapeld), met vier naadloos cross-fadende batches en behoud van
  `prefers-reduced-motion`. In het werkenoverzicht staat voortaan alleen
  `painting` standaard aan; alle andere aanwezige typen moeten via hun chip
  expliciet worden aangezet. Commit `e796bec`.
- Google OAuth was al volledig in code aanwezig, inclusief accountaanmaak en
  veilige koppeling aan een bestaand wachtwoordaccount. `pages.newUser` stuurt
  nieuwe Google-gebruikers nu naar `/discover`; terugkerende gebruikers volgen
  de gewone callback. Commit `cb38048`. De live NextAuth-provider genereert de
  juiste productiecallback `https://arttracker-xi.vercel.app/api/auth/callback/google`.
  Nog handmatig in Google Cloud controleren: Audience = External en appstatus
  = In production (de browsersessie was in deze ronde niet beschikbaar).
- Alle 29 echte gekoppelde collectiehouders die nog onder Unknown/Onbekend
  stonden zijn met plaats, land en coördinaten verrijkt en oude importaliassen
  waar nodig samengevoegd. Bronnen: officiële/adresnamen + OSM Nominatim;
  moeilijke gevallen ook tegen Wikidata gecontroleerd. Syncresultaat:
  dev.db 58 verrijkt/16 werkverwijzingen verplaatst; Turso 58/2. Productie
  heeft daarna alleen nog `Private collection` (2 werken) bewust op Unknown;
  twee overige Unknown-rijen zijn lege historische aliassen en komen niet in
  de UI. Commit `bdba2d1`.
- Correctiemeldingen en Discover-keuzes sturen momenteel geen e-mail. Ze komen
  uitsluitend in Turso terecht als respectievelijk `Report`- en `ArtistVote`-
  rijen; er is nog geen admin-inbox/aggregatie in de UI.
- `npm run build` slaagt (alleen de reeds bestaande `<img>`-waarschuwingen).

## Laatst gedaan (2026-09-13, gastmodus)

- `/discover` is nu publiek bereikbaar; gasten kunnen alle kunstenaars
  selecteren en door de drie schermen bladeren. Opslaan vraagt expliciet om
  inloggen/registreren. `/profile` en `/admin` blijven accountafgeschermd.
  Catalogus-, zoek-, museum- en detailpagina’s waren al publiek; hun
  accountacties blijven beschermd door de API. `npm run build` slaagt.

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

## Laatst gedaan (2026-09-13)

- Alle 97 eerder rate-limited Kandinsky- en 2 Vermeer-afbeeldingen zijn alsnog
  opgehaald. De bronrepo-importers gebruiken nu Wikimedia's gangbare
  1280px-`thumb.php`-route met vertraging en 429-backoff.
- Exact 99 bestanden zijn naar R2 geüpload (0 fouten), in `dev.db` naar
  publieke R2-URL's omgezet en via de gerichte afbeeldingssync naar Turso
  geschreven. Productie: Kandinsky 892/952, Vermeer 37/37. Vier nieuwe
  R2-steekproeven geven HTTP 200 JPEG.

## Volgende stap
1. Onderzoek de 60 resterende Kandinsky-records zonder `image_source_url` via
   exact herleidbare institutionele of catalogusbronnen; dit zijn geen
   rate-limitgevallen meer.
2. Houd de 87 resterende beeldloze Van Gogh-records periodiek opnieuw tegen de bron aan:
   50 hebben een historische VGW-reproductie maar geen werkende exact
   herleidbare publieke bron; 37 missen ook in de bron bruikbare metadata.
3. Vergelijk de actuele publieke VGW-telling (2.158) met de vaste 2.135
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
