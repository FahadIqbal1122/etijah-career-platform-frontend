'use client'

// Site-wide 404. It renders inside the root layout only (no next-intl provider), so the language is read
// from the URL prefix (/ar/...) and the copy is kept here instead of in messages/*.json.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Logomark from '@/components/brand/Logomark'
import { track } from '@/lib/analytics'

const COPY = {
  en: {
    eyebrow: 'Error 404',
    title: 'We couldn’t find that page',
    body: 'The link may be old, or the address may have a typo. Your career direction is still just a few clicks away.',
    home: 'Go to the homepage',
    assessment: 'Take the assessment',
    switchLabel: 'العربية',
    switchHref: '/ar',
  },
  ar: {
    eyebrow: 'خطأ 404',
    title: 'لم نعثر على هذه الصفحة',
    body: 'ربما يكون الرابط قديمًا أو فيه خطأ مطبعي. اتجاهك المهني لا يزال على بُعد خطوات قليلة.',
    home: 'العودة إلى الصفحة الرئيسية',
    assessment: 'ابدأ التقييم',
    switchLabel: 'English',
    switchHref: '/en',
  },
} as const

export default function NotFound() {
  // The pathname isn't available while the 404 is server-rendered, so the language is read after mount
  // (English first, then Arabic for /ar/... URLs); the GA event below fires once with the real path.
  const [locale, setLocale] = useState<'en' | 'ar'>('en')
  const t = COPY[locale]

  // Lets GA4/GTM report which URLs hit the 404 (crawlers, old links, ad-link typos).
  useEffect(() => {
    const path = window.location.pathname
    setLocale(path === '/ar' || path.startsWith('/ar/') ? 'ar' : 'en')
    track('page_not_found', { page_path: path, referrer: document.referrer || undefined })
  }, [])

  return (
    <main dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale} className="min-h-screen brand-surface flex items-center justify-center px-4">
      <div className="card p-8 sm:p-10 w-full max-w-md text-center">
        <div className="mb-6 flex justify-center"><Logomark size={44} /></div>
        <p className="eyebrow mb-3">{t.eyebrow}</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-charcoal leading-tight">{t.title}</h1>
        <p className="mt-3 text-sm text-charcoal/60 leading-relaxed">{t.body}</p>
        <div className="mt-7 flex flex-col gap-3">
          <Link
            href={`/${locale}`}
            data-track="404_home"
            className="cta w-full"
            style={{ width: '100%', padding: '12px', fontSize: 14, borderRadius: 12 }}
          >
            {t.home}
          </Link>
          <Link
            href={`/${locale}/assessment`}
            data-track="404_assessment"
            className="text-sm font-semibold text-primary hover:underline py-2"
          >
            {t.assessment}
          </Link>
        </div>
        <p className="mt-6 text-xs text-charcoal/40">
          <Link href={t.switchHref} className="hover:underline">{t.switchLabel}</Link>
        </p>
      </div>
    </main>
  )
}
