import { getTranslations } from 'next-intl/server'

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 's.regtuijt@gmail.com'

const SECTIONS = ['use', 'scraping', 'database', 'images', 'enforce'] as const

export default async function TermsPage() {
  const t = await getTranslations('Terms')
  const h2 = 'text-lg font-semibold text-white mt-8 mb-2'
  const p = 'text-zinc-400 text-sm leading-relaxed'

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-white mb-1">{t('title')}</h1>
      <p className="text-zinc-500 text-xs mb-6">{t('updated')}</p>
      <p className={p}>{t('intro')}</p>

      {SECTIONS.map((key) => (
        <section key={key}>
          <h2 className={h2}>{t(`${key}Title`)}</h2>
          <p className={p}>{t(key)}</p>
        </section>
      ))}

      <h2 className={h2}>{t('contactTitle')}</h2>
      <p className={p}>
        {t.rich('contact', {
          email: () => <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-400 hover:underline">{CONTACT_EMAIL}</a>,
        })}
      </p>
    </div>
  )
}
