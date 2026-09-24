import createNextIntlPlugin from 'next-intl/plugin'

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Artwork-/kunstenaarsafbeeldingen staan sinds 11 september 2026 allemaal
    // op R2 (zie AGENTS.md) — next/image optimaliseert/cachet ze zelf, geen
    // wsrv.nl-tussenstap meer nodig.
    remotePatterns: process.env.R2_PUBLIC_URL
      ? [{ protocol: 'https', hostname: new URL(process.env.R2_PUBLIC_URL).hostname }]
      : [],
  },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
      ],
    }]
  },
}

export default createNextIntlPlugin('./i18n/request.ts')(nextConfig)
