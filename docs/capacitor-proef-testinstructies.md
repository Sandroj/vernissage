# Capacitor-proef: testinstructies voor Sander

Achtergrond en de keuze voor deze aanpak staan in
`~/orca/workspaces/art/main-2/docs/pinacot-appstores-en-verdienmodel-2026-09-16.md`
§4. Dit document is alleen de praktische checklist voor de proef zelf.

## Wat er al staat

- `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android` zijn geïnstalleerd.
- `capacitor.config.ts` wijst naar de live site (`https://arttracker-xi.vercel.app`) — de
  app is een dunne native shell om de bestaande website heen, geen aparte build.
  Backend/API/database blijven ongewijzigd online draaien.
- `ios/` en `android/` projectmappen zijn aangemaakt en gecommit.
- iOS: CocoaPods-dependencies zijn geïnstalleerd (`pod install` is al gedraaid).
  **Niet geverifieerd dat het project ook echt build** — deze sessie heeft alleen
  Xcode Command Line Tools, geen volledige Xcode, dus geen simulator/build mogelijk.
- Android: het project is aangemaakt, maar **niet gebouwd of gesynct** — deze sessie
  heeft geen Java/JDK en geen Android SDK. `./gradlew assembleDebug` faalde meteen
  op een ontbrekende Java-runtime.

## Wat jij nog moet doen om te kunnen bouwen

### iOS
1. Zorg dat volledige **Xcode** geïnstalleerd is (niet alleen de command line tools) —
   via de App Store, of `xcode-select --install` volstaat niet.
2. `cd ios/App && open App.xcworkspace` (niet `.xcodeproj` — anders mis je de Pods).
3. Kies een signing team (je eigen Apple ID volstaat voor een test op je eigen toestel).
4. Sluit je iPhone aan, kies hem als build target, en run.

### Android
1. Installeer **Android Studio** (bevat de benodigde JDK en Android SDK, dat is
   verreweg het makkelijkst — los JDK + los SDK command-line installeren kan ook,
   maar is meer gedoe).
2. Open de map `android/` in Android Studio, laat het gradle-sync-proces lopen.
3. Zet USB-debugging aan op je Android-telefoon, sluit hem aan, en run vanuit
   Android Studio.

### Als je liever eerst tegen je lokale dev-server test i.p.v. de live site
Verander in `capacitor.config.ts` de `server.url` naar je laptops LAN-IP
(niet `localhost` — dat is vanaf de telefoon een ander apparaat), bv.
`http://192.168.1.23:3000`, en run `npm run dev` met je laptop en telefoon op
hetzelfde wifi-netwerk. Daarna `npx cap sync` en opnieuw builden.

## De testchecklist (uit het appstore-plan §4)

Eén complete stroom, op een **echte iPhone én een echte Androidtelefoon**:

1. Inloggen (test dit met e-mail/wachtwoord — zie waarschuwing hieronder over Google).
2. Een museum openen.
3. Een werk registreren ("Mark as seen").
4. Vliegtuigstand aanzetten.
5. De app sluiten en heropenen.
6. Verbinding herstellen (vliegtuigstand weer uit) en kijken of alles klopt.
7. Een foto toevoegen aan een registratie.
8. Een gedeelde werklink openen (bv. via een berichtje aan jezelf).

Een werkende homepage is geen geslaagde proef — pas als deze hele stroom op
beide toestellen werkt, is de proef geslaagd (plan §4).

## Bekend risico: Google-inloggen kan mislukken in de native shell

Google blokkeert het inloggen via Google Sign-In wanneer dat gebeurt binnen een
ingebedde WebView (zoals Capacitor gebruikt) — dit is een bewuste
beveiligingsmaatregel van Google, geen bug in deze app. De kans is reëel dat
"Continue with Google" in de iOS/Android-app een foutmelding geeft
("this browser or app may not be secure") terwijl hetzelfde op een gewone
mobiele browser prima werkt.

Test daarom eerst met e-mail/wachtwoord-inloggen. Als Google inderdaad
faalt, is de gangbare oplossing om de OAuth-stap via de systeembrowser te
laten lopen in plaats van de ingebedde WebView (Capacitor's
`@capacitor/browser`-plugin, of een deep link terug naar de app na
inloggen) — dat is een aparte, kleinere vervolgklus, geen reden om de hele
proef als mislukt te beschouwen.

## Wat nog moet gebeuren na een geslaagde proef

Zie het stappenplan in het appstore-plan (§4, "Ontwikkel beide platforms
vanaf het begin"): een afzonderlijke staging-database en -opslag, een
afgebakende/beveiligde API, mobiele authenticatie, offline-wachtrij voor
registraties, crashrapportage, en echte telefoontests voor camera/login/
navigatie — dat komt pas ná een geslaagde basisproef.
