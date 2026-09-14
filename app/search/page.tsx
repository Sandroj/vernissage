import Link from 'next/link'
import { ArrowUpRight, Building2, MapPin, Search } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { prisma, primaryCatalogue } from '@/lib/prisma'
import { proxyImg } from '@/lib/utils'

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const t = await getTranslations('Search')
  const q = (searchParams.q ?? '').trim()
  const artworks = q ? await prisma.artwork.findMany({
    where: {
      AND: [
        primaryCatalogue,
        { OR: [
          { title: { contains: q } },
          { alternate_titles: { contains: q } },
          { catalogue_id: { contains: q } },
          { jh_catalogue_id: { contains: q } },
          { artist: { name: { contains: q } } },
          { museum: { name: { contains: q } } },
          { museum: { city: { contains: q } } },
        ] },
      ],
    },
    include: { artist: true, museum: true },
    orderBy: [{ year_start: 'asc' }, { title: 'asc' }],
    take: 80,
  }) : []
  const museums = q ? await prisma.museum.findMany({
    where: { OR: [{ name: { contains: q } }, { city: { contains: q } }, { country: { contains: q } }] },
    include: { _count: { select: { artworks: { where: primaryCatalogue } } } },
    orderBy: { name: 'asc' },
    take: 12,
  }) : []

  return (
    <div className="pb-16">
      <div className="mx-auto max-w-3xl py-8 text-center sm:py-12">
        <p className="eyebrow mb-3">{t('eyebrow')}</p>
        <h1 className="font-display text-5xl font-medium text-stone-900 sm:text-7xl">{q ? t('resultsFor', { query: q }) : t('title')}</h1>
        <form className="paper-card mx-auto mt-8 flex max-w-2xl items-center gap-3 rounded-full p-2 pl-5">
          <Search size={18} className="text-[#4256cc]" />
          <input name="q" defaultValue={q} placeholder={t('placeholder')} className="h-11 min-w-0 flex-1 bg-transparent text-stone-900 outline-none placeholder:text-stone-400" autoFocus={!q} />
          <button className="h-11 rounded-full bg-[#4256cc] px-6 text-sm font-semibold text-white transition hover:bg-[#3447b8]">{t('submit')}</button>
        </form>
        {q && <p className="mt-4 text-sm text-stone-500">{t('summary', { works: artworks.length, museums: museums.length })}</p>}
      </div>

      {museums.length > 0 && <section className="mb-14"><h2 className="font-display mb-5 text-3xl font-medium text-stone-900">{t('museumResults')}</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{museums.map((museum) => <Link key={museum.id} href={`/museums/${museum.id}`} className="paper-card group flex items-center gap-4 rounded-2xl p-4 transition hover:-translate-y-1 hover:shadow-xl"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#e7e9fa] text-[#4256cc]"><Building2 size={19} /></span><span className="min-w-0"><strong className="block truncate text-sm text-stone-900">{museum.name}</strong><span className="mt-1 flex items-center gap-1 text-xs text-stone-500"><MapPin size={11} /> {[museum.city, museum.country].filter(Boolean).join(', ')} · {t('worksCount', { count: museum._count.artworks })}</span></span><ArrowUpRight size={15} className="ml-auto text-stone-300 transition group-hover:text-[#4256cc]" /></Link>)}</div></section>}

      {artworks.length > 0 && <section><h2 className="font-display mb-5 text-3xl font-medium text-stone-900">{t('artworkResults')}</h2><div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 md:grid-cols-4 lg:grid-cols-5">{artworks.map((artwork) => <Link key={artwork.id} href={`/artworks/${artwork.id}?returnTo=${encodeURIComponent(`/search?q=${q}`)}`} className="group min-w-0"><div className="aspect-[4/5] overflow-hidden rounded-[1.25rem] bg-stone-200 shadow-sm ring-1 ring-black/5 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-xl"><img src={proxyImg(artwork.image_local_path ?? artwork.image_url) ?? '/placeholder.svg'} alt={artwork.title} className="size-full object-cover transition duration-700 group-hover:scale-105" /></div><h3 className="font-display mt-3 line-clamp-2 text-lg font-semibold leading-tight text-stone-900 group-hover:text-[#4256cc]">{artwork.title}</h3><p className="mt-1 truncate text-[11px] font-medium uppercase tracking-[.08em] text-stone-400">{[artwork.artist.name, artwork.year_start, artwork.catalogue_id, artwork.jh_catalogue_id].filter(Boolean).join(' · ')}</p>{artwork.museum && <p className="mt-1.5 flex items-center gap-1 truncate text-xs text-stone-500"><MapPin size={11} className="text-[#ed694c]" /> {artwork.museum.city || artwork.museum.name}</p>}</Link>)}</div></section>}

      {q && artworks.length === 0 && museums.length === 0 && <div className="paper-card mx-auto max-w-xl rounded-[2rem] p-10 text-center"><Search className="mx-auto mb-4 text-stone-300" size={36} /><h2 className="font-display text-3xl text-stone-900">{t('emptyTitle')}</h2><p className="mt-2 text-sm text-stone-500">{t('emptyText')}</p></div>}
    </div>
  )
}
