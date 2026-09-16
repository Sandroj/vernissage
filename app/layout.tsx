import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import Providers from '@/components/session-provider'
import Nav from '@/components/nav'
import { Toaster } from 'sonner'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getTranslations } from 'next-intl/server'

const geist = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-sans',
})

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Meta')
  return { title: 'Pinacot', description: t('description') }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  return (
    <html lang={locale} className={geist.variable}>
      <body className="min-h-screen antialiased">
        <NextIntlClientProvider>
        <Providers>
          <Nav />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-10">
            {children}
          </main>
          <Toaster
            theme="light"
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#fffdf8',
                border: '1px solid rgba(52,45,34,.12)',
                color: '#24211c',
              }
            }}
          />
        </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
