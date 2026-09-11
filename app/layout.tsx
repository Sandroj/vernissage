import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from '@/components/session-provider'
import Nav from '@/components/nav'
import { Toaster } from 'sonner'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getTranslations } from 'next-intl/server'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Meta')
  return { title: 'Vernissage', description: t('description') }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  return (
    <html lang={locale} className={inter.variable}>
      <body className="min-h-screen antialiased">
        <NextIntlClientProvider>
        <Providers>
          <Nav />
          <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            {children}
          </main>
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#18181b',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#fafafa',
              }
            }}
          />
        </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
