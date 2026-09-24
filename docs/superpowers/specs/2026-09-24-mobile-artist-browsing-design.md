# Mobiel overzichtelijker: homepage-hero + kunstenaars-tegels

> Werkplan-punt 3 (zie HANDOFF.md). Architectural design, goedgekeurd door
> Sander op 24-09-2026.

## Aanleiding

Sander: de header op de homepage voelt te groot op mobiel (desktop is prima
zo), en het is lastig kunstenaars te selecteren op mobiel vanaf de
homepage. Huidige stand: 9 kunstenaars in de app, met uitzicht op ~30 meer.
Bij die schaal wordt zowel de te-grote hero als de huidige grote
kunstenaarskaart (1 kolom op mobiel, 4:3 afbeelding + volledige tekst) een
probleem — een lange, trage scroll om te overzien wat er is.

Buiten scope voor dit ontwerp: performance (laadtijd van kunstenaarspagina's)
— apart vervolgtaakje, zie HANDOFF "Volgende stap".

## Doel

1. De hero-sectie op de homepage neemt op mobiel veel minder verticale
   ruimte in, zonder de desktop-weergave te veranderen.
2. Kunstenaars selecteren/overzien is op mobiel behapbaar bij zowel 9 als
   40 kunstenaars — op de homepage én op `/artists`.

## Ontwerp

### 1. Hero-sectie (`app/page.tsx`, alleen CSS/Tailwind)

Puur responsieve aanpassing, geen nieuwe component, geen gedragsverandering:
- Titel: lagere `clamp()`-ondergrens op mobiel (huidig `clamp(3.6rem, 8vw,
  7.7rem)` — de 3.6rem-vloer is te hoog voor een telefoon).
- Minder verticale padding (`py-8` → kleiner op mobiel, `sm:py-12` etc.
  blijft ongemoeid).
- Fotocarrousel: lagere `h-[370px]` op mobiel (bv. `h-[200px]
  sm:h-[430px]`), zodat de hero als geheel op een telefoon ruwweg de helft
  van de huidige hoogte wordt.
- Desktop (`sm:`/`lg:`-breakpoints) blijft exact zoals nu.

### 2. Eén compacte kunstenaars-tegel (`components/artist-card.tsx`)

Er bestaan nu twee losse implementaties van een "kunstenaar-preview": de
grote `ArtistCard` (gebruikt op `/artists`) en een losse rij-layout
(inline JSX in `app/page.tsx`). Beide vervangen door één compacte tegel,
zodat er nog maar één plek is die de afbeelding-fallback/link/voortgang-
logica bevat.

**Tegel-vorm:**
- Vierkant beeld (i.p.v. 4:3), kleiner dan de huidige kaart.
- Naam eronder, geen nationaliteit/geboortejaar meer in de tegel (die info
  staat al op de kunstenaar-detailpagina — bewuste trade-off voor
  compactheid).
- Klein voortgangsindicator (dunne balk of "3/12"-tekst, geen volledige
  `ProgressBar` met label).
- Zelfde tap-target-grootte als nu (hele tegel is de link), geschikt voor
  duim-bediening.
- Bestaande fallback (initiaal-letter op gekleurde achtergrond als er geen
  afbeelding is) blijft.

**Interface:** dezelfde props als de huidige `ArtistCard` (artist, seenCount,
featuredImage) — geen API/datamodel-wijziging nodig, dit is puur een
presentatie-herschrijving.

### 3. Homepage (`app/page.tsx`)

- "Kunstenaars"-sectie toont een vaste, beperkte set: eerste 8 kunstenaars
  alfabetisch (bestaande sortering), in de compacte tegel, 2 kolommen op
  mobiel (schaalt op bij breder scherm, zelfde grid-breakpoints als
  `/artists` hieronder).
- "Alle kunstenaars →"-link (bestaat al, wijst naar `/artists`) blijft
  staan, wordt de duidelijke uitweg naar de volledige lijst.
- Als er ≤ 8 kunstenaars zijn (huidige situatie: 9, dus bijna dit geval)
  toont de sectie gewoon wat er is; geen aparte lege-staat nodig.

### 4. `/artists`-pagina

- Zelfde compacte tegel, volledige (gefilterde) lijst — geen limiet, de
  bestaande zoekbalk (`ArtistsSearch`) blijft de manier om bij 40+
  kunstenaars snel te vinden wat je zoekt.
- Grid-klasse aangepast van `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` naar
  meer kolommen op elke breakpoint, passend bij de kleinere tegel (bv.
  `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` — exacte aantallen worden
  tijdens implementatie op gevoel afgesteld, geen harde eis).

## Niet in scope

- Performance/laadtijd van kunstenaars- en kunstwerkpagina's — apart
  vervolgtaakje (zie HANDOFF).
- Museum-detailpagina, kunstwerk-detailpagina, nav — ongewijzigd.
- Geen nieuwe data (geen "featured 8"-veld o.i.d.); de eerste 8 alfabetisch
  is de simpelste regel en verandert vanzelf mee als er kunstenaars bij
  komen.

## Testen

- `tsc --noEmit` + `eslint` schoon.
- Lokaal (`npm run dev`, tegen live Turso-data) op mobiel viewport (375px)
  en desktop bekeken: hero-hoogte, tegel-grid op homepage en `/artists`,
  tap-targets, geen regressie op desktop-weergave van de hero.
- Geen datamodel- of API-wijziging, dus geen migratie/testdata nodig.
