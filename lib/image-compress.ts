// ponytail: client-side compression only, still writes a data-URL into the
// DB (Seen.photo_url/Visit.photo_url) — upgrade path is the R2 private-
// photo-storage migration already planned in the production-scale doc.
export const MAX_PHOTO_DIMENSION = 1600
const JPEG_QUALITY = 0.82

export function computeTargetDimensions(
  width: number,
  height: number,
  maxDimension: number = MAX_PHOTO_DIMENSION
): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) return { width, height }
  const scale = maxDimension / Math.max(width, height)
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not decode image'))
    img.src = src
  })
}

export async function compressImageDataUrl(
  dataUrl: string,
  maxDimension: number = MAX_PHOTO_DIMENSION,
  quality: number = JPEG_QUALITY
): Promise<string> {
  try {
    const img = await loadImage(dataUrl)
    const { width, height } = computeTargetDimensions(img.naturalWidth, img.naturalHeight, maxDimension)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return dataUrl
    ctx.drawImage(img, 0, 0, width, height)
    return canvas.toDataURL('image/jpeg', quality)
  } catch {
    return dataUrl
  }
}
