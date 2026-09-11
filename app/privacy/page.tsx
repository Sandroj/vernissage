import { getTranslations } from 'next-intl/server'

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 's.regtuijt@gmail.com'

export default async function PrivacyPage() {
  const t = await getTranslations('Privacy')
  const section = 'space-y-2'
  const h2 = 'text-lg font-semibold text-white mt-8 mb-2'
  const p = 'text-zinc-400 text-sm leading-relaxed'

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-white mb-1">{t('title')}</h1>
      <p className="text-zinc-500 text-xs mb-6">{t('updated')}</p>
      <p className={p}>{t('intro')}</p>

      <h2 className={h2}>{t('collectTitle')}</h2>
      <ul className={`${section} list-disc pl-5`}>
        <li className={p}>{t('collect1')}</li>
        <li className={p}>{t('collect2')}</li>
        <li className={p}>{t('collect3')}</li>
      </ul>

      <h2 className={h2}>{t('useTitle')}</h2>
      <ul className={`${section} list-disc pl-5`}>
        <li className={p}>{t('use1')}</li>
        <li className={p}>{t('use2')}</li>
        <li className={p}>{t('use3')}</li>
      </ul>

      <h2 className={h2}>{t('storageTitle')}</h2>
      <p className={p}>{t('storage')}</p>

      <h2 className={h2}>{t('rightsTitle')}</h2>
      <p className={p}>
        {t.rich('rights', {
          email: () => <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-400 hover:underline">{CONTACT_EMAIL}</a>,
        })}
      </p>

      <h2 className={h2}>{t('cookiesTitle')}</h2>
      <p className={p}>{t('cookies')}</p>
    </div>
  )
}
