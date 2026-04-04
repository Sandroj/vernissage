/** @type {import('next').NextConfig} */
const nextConfig = {
  // Native modules mogen niet worden gebundeld door webpack — ze worden geladen via Node.js
  experimental: {
    serverComponentsExternalPackages: [
      'better-sqlite3',
      '@prisma/adapter-better-sqlite3',
    ],
  },
}

export default nextConfig
