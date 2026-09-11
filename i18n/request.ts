import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'

import { LOCALES, type Locale } from './config'

function isLocale(v: string | undefined): v is Locale {
  return LOCALES.includes(v as Locale)
}

export default getRequestConfig(async () => {
  const fromCookie = cookies().get('locale')?.value
  const fromHeader = headers().get('accept-language')?.slice(0, 2).toLowerCase()
  const locale: Locale = isLocale(fromCookie) ? fromCookie : fromHeader === 'en' ? 'en' : 'nl'
  return { locale, messages: (await import(`../messages/${locale}.json`)).default }
})
