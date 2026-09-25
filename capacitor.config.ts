import type { CapacitorConfig } from '@capacitor/cli'

// Wrapt de bestaande live Next.js-app in een native shell — er wordt geen
// aparte statische build gebundeld (kan ook niet: SSR + API routes + Prisma/
// Turso-backend). server.url laadt de site zoals hij nu al draait; voor
// lokaal testen tijdelijk vervangen door je LAN-IP, bv.
// 'http://192.168.1.23:3000' (niet 'localhost' — dat is voor de telefoon
// zelf, niet je laptop). Zie appstore-plan §4 in de datarepo voor de
// achtergrond van deze keuze.
const config: CapacitorConfig = {
  appId: 'gallery.seen.app',
  appName: 'Seen',
  // NIET 'public' — dat is de echte Next.js-map met public/images/artworks
  // (3GB, gitignored, alleen voor lokale scrapers). server.url hieronder
  // laadt de site sowieso remote, dus webDir wordt nooit getoond; het bestaat
  // alleen omdat `npx cap sync` een map nodig heeft om te kopiëren.
  webDir: 'capacitor-www',
  server: {
    url: 'https://www.seen.gallery',
    cleartext: false,
  },
}

export default config
