export const LOCALES = ['nl', 'en'] as const
export type Locale = (typeof LOCALES)[number]
