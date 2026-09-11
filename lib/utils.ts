import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Proxy remote images via wsrv.nl to bypass hotlink blocks (e.g. WikiArt)
export function proxyImg(url: string | undefined | null, w = 600): string | undefined {
  if (!url || url.startsWith('/')) return url ?? undefined
  const stripped = url.replace(/^https?:\/\//, '')
  return `https://wsrv.nl/?url=${stripped}&w=${w}&q=80&output=webp`
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
