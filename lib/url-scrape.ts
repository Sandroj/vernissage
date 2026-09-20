const mediumKeywords = ['olieverf op doek', 'oil on canvas', 'aquarel', 'watercolour', 'watercolor', 'ets', 'etching', 'litho', 'lithograph', 'brons', 'bronze', 'gouache', 'tempera', 'houtskool', 'charcoal', 'gips', 'plaster', 'marmer', 'marble']

const htmlEntities: Record<string, string> = { '&amp;': '&', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&lt;': '<', '&gt;': '>' }
function decodeEntities(text: string): string {
  return text.replace(/&(amp|quot|#39|apos|lt|gt);/g, (entity) => htmlEntities[entity])
}

export function extractMeta(html: string, name: string): string | undefined {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`, 'i')
  const match = html.match(re)
  const value = match ? (match[1] ?? match[2])?.trim() : undefined
  return value ? decodeEntities(value) : undefined
}

export function extractDimensions(text: string): string | undefined {
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*[×xX]\s*(\d+(?:[.,]\d+)?)\s*cm/)
  return match ? `${match[1]} x ${match[2]} cm` : undefined
}

export function extractMedium(text: string): string | undefined {
  const lower = text.toLowerCase()
  return mediumKeywords.find((keyword) => lower.includes(keyword))
}
