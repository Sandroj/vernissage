/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    'better-sqlite3',
    '@prisma/adapter-better-sqlite3',
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Vertel webpack: laad deze native modules via Node.js, niet bundelen
      const externals = Array.isArray(config.externals) ? config.externals : []
      config.externals = [
        ...externals,
        'better-sqlite3',
        '@prisma/adapter-better-sqlite3',
      ]
    }
    return config
  },
}

export default nextConfig
