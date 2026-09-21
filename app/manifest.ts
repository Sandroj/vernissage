import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pinacot',
    short_name: 'Pinacot',
    description: 'Houd bij welke kunstwerken je hebt gezien',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f0e7',
    theme_color: '#4256cc',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
