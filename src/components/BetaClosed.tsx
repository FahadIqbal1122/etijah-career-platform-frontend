'use client'

// Shown at /assessment while the free beta is closed (Admin → Settings → Beta).
import { useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import Logomark, { Wordmark } from '@/components/brand/Logomark'

const COPY = {
  en: {
    title: 'The free beta has ended',
    body: 'Thank you to everyone who took part. Your feedback is shaping the full launch of Etijahi, which is coming soon.',
    cta: 'Back to the home page',
  },
  ar: {
    title: 'انتهت التجربة المجانية',
    body: 'شكرًا لكل من شارك. ملاحظاتكم تساهم في تشكيل الإطلاق الكامل لإتجاهي، وهو قريب.',
    cta: 'العودة إلى الصفحة الرئيسية',
  },
}

export default function BetaClosed() {
  const locale = useLocale()
  const c = locale === 'ar' ? COPY.ar : COPY.en
  return (
    <main dir={locale === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-white">
      <div className="flex items-center gap-2 mb-8">
        <Logomark size={36} />
        <Wordmark />
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3">{c.title}</h1>
      <p className="max-w-md text-slate-500 mb-8">{c.body}</p>
      <Link href="/" className="px-6 py-3 rounded-full bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors">
        {c.cta}
      </Link>
    </main>
  )
}
