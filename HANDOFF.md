# HANDOFF — Vernissage

## Aanvulling — 16 september 2026 (admin-tabindeling)

- De admin opent nu standaard met `Werk bewerken`: zoeken, een bestaand record
  kiezen en gericht overschrijven.
- `Importeren` staat in een aparte hoofdtab met uitleg dat dit alleen bedoeld is
  voor gecontroleerde scraper-output of een nieuw los werk. De eerdere donkere
  importer-styling is vervangen door de lichte Vernissage-formulieren.
- Getest met `npm run build` en `git diff --check`. Branch
  `codex/admin-tabs` wacht op push/merge.

## Aanvulling — 16 september 2026 (admin-editor UI en beeldoptimalisatie)

- Nieuwe branch `codex/admin-editor-polish` vanaf productie-`main` maakt het
  adminformulier duidelijker met zoekworkflow, geselecteerd record, veldgroepen,
  voorbeeldafbeelding, expliciete resetknop en opslagstatus.
- Admin-afbeeldingen mogen tot 25 MB worden aangeleverd. De server controleert
  signatures, draait EXIF-oriëntatie recht, schaalt naar maximaal 2400×2400 px
  en comprimeert naar WebP (quality 82) vóór R2-upload. De API retourneert de
  originele en geoptimaliseerde bestandsgrootte.
- `sharp` is als runtime dependency toegevoegd. `npm run build` slaagt; alleen
  de bestaande `<img>`-lintwarnings blijven.
- Nog te doen: deze branch pushen/mergen en daarna de productiebuild laten
  deployen.

## Aanvulling — 15 september 2026 (beheer, bruiklenen en datatoegang)

- Branch `codex/kandinsky-feedback-fixes` staat op GitHub. De eerdere Duitse
  titels, suggestieformulieren en filterfix zijn gepusht maar nog niet
  gemerged/gedeployed; e-mail vereist nog steeds de Resend-omgevingsvariabelen.
- `/admin` is nu beperkt tot `ADMIN_EMAILS` (standaard
  `s.regtuijt@gmail.com`); `/api/import` en alle nieuwe admin-API’s controleren
  dezelfde allowlist. Het dashboard kan werkvelden en museumkoppelingen
  aanpassen, beelden naar R2 uploaden en bewaart before/after in `ArtworkEdit`.
  Voor nieuwe beelden zijn R2-upload, bronlink, bronnaam, rechtennotitie en
  ophaaldatum nodig.
- `Loan` houdt uitlener (museum of genoemde privé-eigenaar), ontvangend museum,
  datums, bron en actuele status apart van de collectie-eigenaar in
  `Artwork.museumId`. Werkdetails en beide museumpagina’s tonen actuele
  bruiklenen; dashboard kan een uitleen sluiten en de historie blijft staan.
- De publieke `/api/artworks` geeft maximaal 100 records per verzoek en laat
  pagineren met `offset`/`limit`. Dit maakt één bulkdump minder eenvoudig maar
  voorkomt crawlen niet. `docs/collection-protection.md` documenteert wat op
  Cloudflare nog handmatig nodig is.
- Build, Prisma-validatie, migratiesmoke-test, script-syntaxcheck en
  `git diff --check` slagen. Migratie `20260915160000_add_admin_edits_and_loans`
  is **nog niet** op Turso toegepast; pas toe als onderdeel van een
  goedgekeurde productierelease. De featurebranch is niet naar `main` gemerged.

## Laatste update — 15 september 2026 (Kandinsky, meldingen en Duitse titels)

- De filter voor beeldloze werken toont deze records nu ook wanneer alle
  gewone typefilters uitstaan. De typefilters blijven van toepassing op werken
  met een afbeelding.
- Kandinsky-records hebben een optioneel `title_de`-veld. Dit is op de
  detailpagina zichtbaar onder de hoofdtitel en doorzoekbaar; 532 Duitse
  ondertitels uit de gekoppelde Kandinsky-bronpagina’s en 198 Duitse
  Wikidata-labels zijn in dev.db en Turso ingevuld (656 van 897 werken).
- Kandinsky DB 599 is samengevoegd in DB 42. De twee bronpagina’s canonicalen
  naar dezelfde entry en beide R2-bestanden hebben dezelfde SHA-256. Er waren
  geen Seen- of Report-relaties. De bewaarde titel en bronlink zijn
  rechtgezet; JSON-backups staan in `/tmp/kandinsky-wall-b-duplicate-*.json`.
- Kunstenaars- en werkdetailpagina’s hebben nu formulieren voor respectievelijk
  ontbrekende werken en onjuiste vermeldingen. Inzendingen worden opgeslagen
  als `WorkSuggestion` en per Resend naar `s.regtuijt@gmail.com` gestuurd.
  De Resend API-sleutel en een geverifieerd afzenderadres ontbreken nog in
  Vercel/.env.local; tot die zijn ingesteld meldt de UI dat alleen opslag is
  gelukt.
- De Louvre-pin met twee werken betreft Vermeer; de Louvre-collectiedatabase
  geeft precies twee Johannes-Vermeer-resultaten (*La Dentellière* en
  *L’Astronome*).
- `npm run build`, `node --check` voor beide nieuwe scripts en
  `git diff --check` slagen. Bestaande `<img>`-waarschuwingen blijven.
- Nog open: exacte Christie’s-page-2-resultaten konden niet uitgelezen worden;
  de pagina laadt via een API die 404 antwoordt. Daarna de appbranch reviewen,
  Resend-omgevingsvariabelen instellen en deployen.

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

## Laatst gedaan (2026-09-14, snelheidsronde)

- Homepage en `/artists` halen gebruikersvoortgang nu met één Seen-relationquery
  op in plaats van één `count`-query per kunstenaar. Dit vermindert de
  serverlatency vooral bij Turso.
- De kunstenaarsdetailpagina selecteert alleen de artwork-, museum-, artist-
  en Seen-velden die de UI gebruikt. Daardoor wordt minder data naar de client
  geserialiseerd, zonder de filters of detailmodal te wijzigen.
- Gesloten Seen-modals worden niet meer voor elke kaart gemount; ze worden pas
  bij openen aangemaakt. Artwork- en kunstenaarsafbeeldingen onder de fold
  gebruiken lazy loading/asynchrone decoding; de eerste hero-batch krijgt hoge
  laadprioriteit.
- Getest met `npm run build` en `git diff --check`; build slaagt. De bestaande
  `<img>`-lintwaarschuwingen blijven aanwezig. Geen DB-, R2- of Turso-mutaties.

## Laatst gedaan (2026-09-14, Kandinsky-dubbelen)

- De 29 hoge-zekerheidsgroepen uit `docs/kandinsky-duplicate-audit.md` plus
  `270 -> 5417` zijn relationeel veilig samengevoegd in zowel `dev.db` als
  Turso. De oude 30 rijen zijn verwijderd; de 30 institutionele/Wikidata-rijen
  blijven als publieke kaart over.
- `Seen` en `Report` worden door `scripts/merge-kandinsky-duplicates.mjs`
  behouden of naar de keep-rij verplaatst. De dry-run vond op beide databases
  geen gekoppelde Seen/Report-rijen op de te verwijderen oude records.
- Backups zijn opgeslagen als `/tmp/kandinsky-duplicate-backup-dev-*.json` en
  `/tmp/kandinsky-duplicate-backup-turso-*.json`. De expliciet onzekere groepen
  zijn niet aangepast.
- Verificatie-dry-run na afloop: beide databases tonen nog alleen de 30 keep-
  rijen van deze merge. Commit `8ace4a4` is naar `origin/main` gepusht en
  `https://arttracker-xi.vercel.app/artists/wassily-kandinsky` antwoordt HTTP
  200 met de bijgewerkte telling (919 Kandinsky-werken).

## Laatst gedaan (2026-09-14, Kandinsky-profielverrijking)

- Na feedback op de eerste merge zijn de ontbrekende complementaire velden uit
  de oude records teruggezet met `scripts/enrich-kandinsky-merged-records.mjs`.
  Het script koppelt musea op naam/stad/land omdat museum-id’s lokaal en in
  Turso niet stabiel zijn.
- 29 bewaarde rijen kregen ontbrekende locatie- en/of afmetingsvelden terug.
  Voor `Gabriele Münter` (5302) is na visuele vergelijking bewust de scherpere
  schilderijuitsnede `work-12.jpg` gekozen, inclusief bijbehorende provenance,
  Lenbachhaus-locatie en afmetingen.
- Toegepast en read-only gecontroleerd in dev.db en Turso. Kandinsky staat op
  919 werken; de inhoudelijke wijzigingen zijn direct in Turso zichtbaar.

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

## Laatst gedaan (2026-09-13, profiel en datakwaliteit)

- Kunstenaarskaarten gebruiken nu herkenbare ankerwerken (met fallback naar het
  bestaande eerste beeld). `/profile` is herontworpen met lichte Vernissage-
  cards, avatar, statistieken, recente gezien-items en instellingen.
- F1666 (*Three figures walking along a canal*) is gecontroleerd via de
  VGGallery-painting- en drawing-pagina’s. De bron zegt expliciet dat het
  medium niet vast te stellen is en het werk in beide secties staat. Het
  record staat daarom in dev.db en Turso op `unclassified`; het herstel is
  reproduceerbaar via `scripts/repair-f1666-classification.mjs`.
- `npm run build` slaagt; alleen bestaande `<img>`-lintwaarschuwingen.

## Laatst gedaan (2026-09-13, multi-type classificatie)

- De broncatalogus bevat 9 unieke werken die in meerdere verschillende
  type-secties staan: 8 als painting + print en F1666 als painting + drawing.
  In totaal zijn er 15 cross-listed identiteiten wanneer dubbele vermeldingen
  binnen hetzelfde type worden meegerekend.
- F1666 staat nu in dev.db en Turso als één werkrecord met
  `type_normalized='painting|drawing'`; het verschijnt dus in beide typefilters
  zonder dubbele kaart en zonder `unclassified`.
- `artwork-grid.tsx`, de artwork-API en de detailweergave ondersteunen nu
  pipe-separated multi-types. De reparatiescript-documentatie is bijgewerkt.
- Getest: gerichte dev.db/Turso-sync (`1` rij elk), resterende
  `unclassified`/NULL-classificaties gecontroleerd en `npm run build` slaagt
  (alleen bestaande `<img>`-lintwaarschuwingen).

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
