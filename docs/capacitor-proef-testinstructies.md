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
- iOS: de GitHub Actions Capacitor-proof bouwt de simulator-app, boot een
  simulator en bevestigt met screenshot dat de live site zichtbaar laadt.
- Android: de GitHub Actions Capacitor-proof bouwt de debug-APK en start de
  app zonder app-specifieke fouten in `adb logcat`. De gratis Linux-runner heeft
  geen hardware-acceleratie en is te traag voor een betrouwbare screenshot; dit
  is dus nog geen sluitende Android-bevestiging.
- Twee scaffolding-problemen zijn al gefixt: de gedeelde Xcode-scheme staat in
  git en Android sluit de oude losse `kotlin-stdlib-jdk7`/`jdk8` artifacts uit.

## Wat jij nu nog moet doen

De eerstvolgende echte beslissing hangt aan Android: werkt de Capacitor-shell
op een hardware-versnelde emulator of fysiek Android-toestel door de volledige
kernflow heen? iOS is voor booten/laden al bewezen in CI, maar mag later alsnog
op een echte iPhone door dezelfde gebruikersflow.

### Android
1. Installeer **Android Studio** (bevat de benodigde JDK en Android SDK, dat is
   verreweg het makkelijkst — los JDK + los SDK command-line installeren kan ook,
   maar is meer gedoe).
2. Open de map `android/` in Android Studio, laat het gradle-sync-proces lopen.
3. Test bij voorkeur eerst op een fysiek Android-toestel. Alternatief: maak in
   Device Manager een hardware-versnelde emulator aan, bijvoorbeeld een recente
   Pixel met een `x86_64` system image.
4. Run de app vanuit Android Studio.
5. Als de app niet zichtbaar laadt: open Logcat, filter op `com.pinacot.app` en
   noteer alleen app-specifieke fouten. Algemene `System UI isn't responding`-
   meldingen op een trage emulator zijn op zichzelf geen bewijs van een appbug.

### iOS later opnieuw op toestel
1. Zorg dat volledige **Xcode** geïnstalleerd is (niet alleen de command line tools).
2. `cd ios/App && open App.xcworkspace` (niet `.xcodeproj` — anders mis je de Pods).
3. Kies een signing team (je eigen Apple ID volstaat voor een test op je eigen toestel).
4. Sluit je iPhone aan, kies hem als build target, en run.

### Als je liever eerst tegen je lokale dev-server test i.p.v. de live site
Verander in `capacitor.config.ts` de `server.url` naar je laptops LAN-IP
(niet `localhost` — dat is vanaf de telefoon een ander apparaat), bv.
`http://192.168.1.23:3000`, en run `npm run dev` met je laptop en telefoon op
hetzelfde wifi-netwerk. Daarna `npx cap sync` en opnieuw builden.

## De testchecklist (uit het appstore-plan §4)

Eén complete stroom, nu eerst op **Android** en later ook op een echte iPhone:

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

## Wanneer is de Android-proef geslaagd?

- De app bouwt en start vanuit Android Studio.
- De live site laadt zonder handmatige browseromweg.
- E-mail/wachtwoord-login werkt.
- De volledige testchecklist hierboven werkt op hetzelfde toestel.
- Foto toevoegen opent de native picker/camera-flow en de foto blijft zichtbaar
  na opnieuw openen.
- Na vliegtuigstand, sluiten, heropenen en verbinding herstellen raakt de
  registratie niet kwijt.
- Logcat toont geen terugkerende fout uit `com.pinacot.app` tijdens de flow.

Als dit lukt, blijft Capacitor de voorkeursroute voor de eerste gesloten
appstoretests. Als dit niet lukt, beslissen we gericht of we Capacitor repareren
of de mobiele client alsnog met Expo/React Native gaan bouwen.

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
