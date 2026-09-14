/** Keep dates in year_start/year_end, never in the displayed artwork title. */
export function normalizeArtworkTitle(title: string): string {
  return title
    .replace(/\b(?:1[0-9]{3}|20[0-9]{2})\b/g, '')
    .replace(/\s+,/g, ',')
    .replace(/,\s*(?=\()/g, ' ')
    .replace(/\s*\(\s*No\./g, ' (No.')
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
