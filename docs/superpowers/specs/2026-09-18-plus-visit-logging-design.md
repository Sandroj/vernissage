# Pinacot Plus: bezoekgeschiedenis + foto-nadruk in "gezien"-flow — Design Spec

**Datum:** 2026-09-18
**Status:** Goedgekeurd

---

## Overzicht

Eerste betaalde Plus-feature ("archivaris-toolkit", zie
`docs/pinacot-prijsanalyse-2026-09-16.md`): gebruikers kunnen **meerdere
bezoeken aan hetzelfde werk vastleggen**, elk met eigen datum, locatie,
notities, waardering en foto. Dit is expliciet aangewezen als een
"noodzakelijke productvoorwaarde" in de eerdere prijsresearch — zonder deze
functie valt zowel de betaalreden als de retentie weg.

Tegelijk krijgt de bestaande gratis "markeer als gezien"-flow een
foto-nadruk-redesign: de foto wordt het centrale, uitnodigende element in
plaats van een verstopt formulierveld onderaan. Dit geldt voor **alle**
gebruikers, gratis en Plus — een aantrekkelijke basiservaring is wat mensen
overhaalt om voor meer (herhaalbezoeken) te willen betalen.

Dit is de eerste plek in de app die daadwerkelijk naar
`/api/billing/checkout` linkt (de betaalinfrastructuur zelf stond al, zie
HANDOFF.md 17 september 2026 — maar had nog geen UI-toegangspunt).

## Niet-doelen

- Onbeperkte/gratis foto-opslag oplossen (R2-migratie, quota) — aparte,
  latere fase uit het productieplan. Dit ontwerp voegt alleen client-side
  compressie toe als tussenstap, geen opslagmigratie.
- Offline registratie — apart werkpakket.
- Rate limiting op de nieuwe route — bestaande bredere backlog-post.

## Datamodel

Nieuw model, geen wijziging aan bestaand `Seen`:

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

Geen `@@unique([userId, artworkId])` — dat is precies het verschil met
`Seen`: meerdere rijen per gebruiker/werk zijn toegestaan.

`Seen` blijft ongewijzigd van schema en van de bestaande
`POST /api/seen`-route (gratis, ongewijzigd, schrijft nooit naar `Visit`).
`Seen` fungeert na deze wijziging als "nieuwste stand"-cache: elke keer dat
een `Visit` wordt aangemaakt of verwijderd, wordt `Seen.dateSeen`/
`locationSeen`/`notes`/`rating`/`photo_url` bijgewerkt naar de nieuwste
overgebleven `Visit` (of, als er geen `Visit`-rijen zijn, ongewijzigd
gelaten — `Seen` kan prima bestaan zonder ooit een `Visit` te hebben gehad).
Zo hoeven de 11 bestaande plekken die `Seen` lezen (kaart, tellers,
artiestprogressie, profielpagina, `Recently seen`, enz.) niet aangepast te
worden.

## API

### `POST /api/visits`

Altijd Plus-only (`Entitlement.active` check via `getServerSession` +
`prisma.entitlement.findUnique`), ongeacht of het de 1e of Ne log is voor
dit werk. Body: `{ artworkId, dateSeen, locationSeen?, notes?, rating?,
photo_url? }`. Maakt de `Visit`-rij aan, synct daarna `Seen` (upsert: als
er nog geen `Seen`-rij bestaat, wordt die nu ook aangemaakt — een Plus-
gebruiker kan zo direct een bezoek loggen voor een werk dat nog niet als
"gezien" gemarkeerd stond). Niet-Plus → `403` met een duidelijke
foutmelding (geen 500).

### `GET /api/visits?artworkId=`

Geeft de bezoekgeschiedenis van de ingelogde gebruiker voor dit werk terug
(gesorteerd op datum, nieuwste eerst). Geen Plus-check nodig om te
*bekijken* — alleen *toevoegen*/*verwijderen* is gated. Zo blijft een
eventuele eerder opgebouwde geschiedenis zichtbaar als iemands abonnement
afloopt.

### `DELETE /api/visits/[id]`

Plus-only, alleen de eigen rij (ownership-check op `userId`). Na
verwijderen: `Seen` opnieuw synchroniseren vanuit de overgebleven
`Visit`-rij met de nieuwste datum, of ongewijzigd laten als er geen
`Visit`-rijen meer over zijn.

## UI

### Redesign `seen-modal.tsx` (geldt voor gratis én Plus)

Huidige volgorde (datum, locatie, waardering, notities, foto onderaan als
klein dashed-uploadvakje) wordt omgedraaid:

1. **Foto bovenaan, groot en uitnodigend** — vervangt het huidige kleine
   uploadvakje. Behoudt de bestaande `capture="environment"` (opent al
   camera op mobiel), alleen visueel prominenter. Copy wordt uitnodigend
   in plaats van neutraal: bijv. "Voeg een foto toe — bewijs dat je er
   was" i.p.v. een kaal "Foto"-label.
2. Datum/locatie/waardering/notities verhuizen naar een compactere sectie
   eronder — blijven functioneel identiek, alleen visueel ondergeschikt.
3. **Client-side compressie** vóór het wegschrijven als data-URL: resize
   naar een redelijke maximale afmeting (bv. 1600px lange zijde) en
   her-encode als JPEG/WebP met kwaliteitsreductie, via canvas — geen
   nieuwe dependency. Mislukt de compressie (onbekend formaat e.d.), dan
   wordt de originele data-URL gebruikt in plaats van de actie te
   blokkeren.
   `ponytail: blijft data-URL-in-DB, geen R2-migratie — upgrade-pad is de
   al geplande foto-opslagmigratie uit het productieplan.`

### Bezoekgeschiedenis + upsell op de werkdetailpagina

Bij een werk waar de gebruiker al een `Seen`-markering voor heeft:
- **Plus-gebruiker:** lijst van eerdere bezoeken (uit `GET /api/visits`)
  onder de bestaande "gezien"-status, plus een knop "Nog een bezoek
  toevoegen" die dezelfde geredesignde modal opent (nu gekoppeld aan
  `POST /api/visits` i.p.v. `/api/seen`).
- **Niet-Plus gebruiker:** in plaats van die knop een korte upsell-kaart —
  "Bewaar meerdere bezoeken aan dit werk met Pinacot Plus — €24,99/jaar" —
  met een knop die `POST /api/billing/checkout` aanroept en doorstuurt naar
  de teruggegeven Stripe-URL. **Dit is het eerste daadwerkelijke
  toegangspunt naar checkout in de app.**

## Randgevallen

- Abonnement loopt af (webhook zet `Entitlement.active` op false):
  bestaande `Visit`-rijen blijven bewaard en zichtbaar; alleen
  toevoegen/verwijderen wordt weer geblokkeerd (upsell-kaart verschijnt
  opnieuw).
- Compressie mislukt: originele data-URL gebruiken, actie niet blokkeren.
- Laatste `Visit` van een werk verwijderd: `Seen` blijft intact zoals
  die al was (bestaat onafhankelijk van `Visit`).

## Testen

Non-triviale logica die een test krijgt (bij `__tests__/lib/`, past bij
bestaande jest-opzet, geen nieuwe frameworks):

- Plus-gate op `/api/visits` (403 zonder actief abonnement, 200 met).
- `Seen`-synchronisatielogica: nieuwste `Visit` wint; na verwijderen van de
  nieuwste valt het terug op de eerstvolgende; zonder overgebleven
  `Visit`-rijen blijft `Seen` ongewijzigd.
- Compressiefunctie: verkleint een te grote afbeelding, laat een kleine
  ongemoeid, valt terug op origineel bij een decodeerfout.

## Vervolg

Implementatieplan volgt via de `writing-plans`-skill, apart van dit
ontwerpdocument.
