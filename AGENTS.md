<!-- ════════════════ AI-START — lees dit eerst, elke sessie ════════════════ -->
<!-- Dit blok is tool-neutraal. Claude, Codex en Antigravity lezen dit bestand
     bij het opstarten (via AGENTS.md, of via de symlinks CLAUDE.md / GEMINI.md).
     Bewerk de flow-regels hieronder alleen bewust — ze houden het project
     doorontwikkelbaar over meerdere AI's en sessies heen. -->

# Doorontwikkel-flow (elke AI, elke sessie)

Dit project gebruikt een tool-neutrale flow zodat elke AI — of het nu Claude,
Codex of Antigravity is — naadloos verder kan waar de vorige stopte. **Git is de
waarheid; `HANDOFF.md` is het kompas.**

## Zodra je op dit project wordt gericht

1. Oriënteer op de echte stand: `git status` en `git log --oneline -12`.
2. Lees **`HANDOFF.md`** — daar staat waar de vorige sessie stopte en wat de
   volgende stap is. Lees ook de rest van dit bestand (project-instructies).
3. Pak "Volgende stap" uit `HANDOFF.md` op, of doe wat de gebruiker vraagt.
   Twijfel je wat de bedoeling is? Vraag het — verzin geen richting.

## Terwijl je werkt

- Commit klein en vaak, met duidelijke berichten in de gebiedende wijs
  ("Fix sync-bug in importer", niet "wijzigingen").
- Verwijder of overschrijf geen bestanden zonder overleg met de gebruiker.
- Eén AI tegelijk in deze repo. Werk je parallel, gebruik dan een aparte
  git-branch of worktree.

## Voordat je stopt (of de gebruiker weggaat)

1. **Commit al je werk** — laat de repo schoon achter (`git status` clean).
   Werk dat niet af is: commit als WIP met een duidelijk bericht.
2. **Werk `HANDOFF.md` bij**: wat je deed, wat af/getest is, de volgende stap,
   en elke valkuil die je tegenkwam. Schrijf het voor een AI die dit gesprek
   niet gezien heeft.
3. Meld de gebruiker in één zin waar het project nu staat.

<!-- ════════════════ EINDE AI-START — hieronder project-specifiek ════════════════ -->

# Vernissage — projectinstructies

<!-- Vul dit in voor dit specifieke project. De AI-START-flow hierboven staat
     los hiervan en hoef je niet aan te passen. -->

## Wat is dit
Eén alinea: wat het project is, wie het gebruikt, live of prototype.

## Catalogus- en beeldkwaliteit
Vincent van Gogh is het ijkpunt voor iedere volgende kunstenaar: kies en
documenteer één gezaghebbend hoofdregister, behoud alle canonieke werken ook als
een beeld nog ontbreekt, en behandel ieder ontbrekend beeld als een actieve
onderzoekstaak. Nieuwe afbeeldingen vereisen een exacte catalogus- of
institutionele objectmatch en opgeslagen bron, rechtennotitie en ophaaldatum.
De volledige verplichte workflow staat in de buitenste datarepo in
`docs/catalogue-and-image-standard.md`; volg ook altijd het bestaande
R2-upload → dev.db-update → gerichte Turso-sync-pad.

### ⚠️ Belangrijk: privéfoto's (Seen/Visit) staan in een tweede, private R2-bucket
Sinds 18 september 2026 zijn er twee R2-buckets naast elkaar: de bestaande
publieke `arttracker-images` (kunstwerkafbeeldingen, `Artwork.image_url`,
onveranderd) en een nieuwe **private** bucket voor door gebruikers geüploade
foto's ("gezien"/bezoek-foto's), env-var `R2_PRIVATE_BUCKET` — geen publieke
custom domain eraan gekoppeld, dat is een eenmalige handmatige stap in het
Cloudflare-dashboard, niet iets dat vanuit code geregeld kan worden.
`Seen.photo_url`/`Visit.photo_url` bevatten nu een R2-**key**
(`photos/<userId>/<uuid>.jpg`), geen URL meer — lees ze altijd via
`signedPhotoUrl`/`signPhotoUrls` uit `lib/photo-storage.ts`, nooit
rechtstreeks in een `<img src>` renderen. De 5 bestaande `data:`-rijen in
productie blijven permanent ongemigreerd (bewuste productbeslissing, geen
TODO) — `signedPhotoUrl` herkent en passeert ze ongewijzigd.

## Stack & structuur
- Taal / framework:
- Hoe draai je het lokaal:
- Belangrijke mappen:

## Zo verifieer je een wijziging
De echte check voor dit project (draai dit voordat je "klaar" zegt):
- Bijv. `npm test`, `npm run build`, of een specifiek commando. Vul in.

## Valkuilen (uit echte sessies)
- Leg hier vast wat misging, zodat de volgende AI dezelfde fout niet maakt.

## Werkafspraken
- Taal van communicatie:
- Wat de gebruiker zelf doet / niet aangeraakt wil hebben:
