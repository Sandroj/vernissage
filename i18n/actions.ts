'use server'
import { cookies } from 'next/headers'
import { LOCALES, type Locale } from './config'

export async function setLocale(locale: Locale) {
  if (!LOCALES.includes(locale)) return
  cookies().set('locale', locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
}
