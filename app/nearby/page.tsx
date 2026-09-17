import { prisma } from '@/lib/prisma'
import { getTranslations } from 'next-intl/server'
import NearbyScreen from '@/components/nearby-screen'

export default async function NearbyPage() {
  const t = await getTranslations('Nearby')
  const artists = await prisma.artist.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div>
      <div className="mb-7 max-w-3xl">
        <p className="eyebrow mb-3">{t('eyebrow')}</p>
        <h1 className="font-display text-5xl font-medium tracking-tight text-stone-900 sm:text-6xl">{t('title')}</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-500 sm:text-base">{t('subtitle')}</p>
      </div>
      <NearbyScreen artists={artists} />
    </div>
  )
}
