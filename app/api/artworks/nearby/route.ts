import { NextResponse } from 'next/server'
import { prisma, primaryCatalogue } from '@/lib/prisma'
import { haversineKm } from '@/lib/geo'

const RADIUS_KM = 200

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const lat = Number.parseFloat(searchParams.get('lat') ?? '')
  const lng = Number.parseFloat(searchParams.get('lng') ?? '')
  const artistIds = (searchParams.get('artistIds') ?? '')
    .split(',')
    .map((id) => Number.parseInt(id, 10))
    .filter((id) => Number.isInteger(id))

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
  }

  const now = new Date()
  const artworks = await prisma.artwork.findMany({
    where: {
      AND: [primaryCatalogue, artistIds.length > 0 ? { artistId: { in: artistIds } } : {}],
    },
    include: {
      artist: { select: { name: true } },
      museum: true,
      loans: {
        where: { current: true, OR: [{ endAt: null }, { endAt: { gte: now } }] },
        include: { toMuseum: true },
        take: 1,
      },
    },
  })

  const results = artworks
    .map((artwork) => {
      const activeLoan = artwork.loans[0]
      const location = activeLoan ? activeLoan.toMuseum : artwork.museum
      if (!location || location.lat == null || location.lng == null) return null

      const distanceKm = haversineKm(lat, lng, location.lat, location.lng)
      if (distanceKm > RADIUS_KM) return null

      return {
        id: artwork.id,
        title: artwork.title,
        year: artwork.year_start,
        image: artwork.image_local_path ?? artwork.image_url ?? undefined,
        artistName: artwork.artist.name,
        distanceKm: Math.round(distanceKm),
        location: { id: location.id, name: location.name, city: location.city, country: location.country, lat: location.lat, lng: location.lng },
        onLoan: Boolean(activeLoan),
        homeMuseum: activeLoan && artwork.museum ? { name: artwork.museum.name, city: artwork.museum.city } : null,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => a.distanceKm - b.distanceKm)

  return NextResponse.json({ radiusKm: RADIUS_KM, artworks: results })
}
