import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://arttracker-xi.vercel.app'
  return {
    rules: {
      userAgent: '*',
      allow: ['/artists', '/artworks', '/museums', '/search'],
      disallow: ['/admin', '/api', '/profile', '/discover', '/login', '/reset-password'],
    },
    sitemap: `${baseUrl.replace(/\/$/, '')}/sitemap.xml`,
  }
}
