import type { Metadata } from 'next'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'

export const metadata: Metadata = {
  title: 'Etijahi — Career Compass',
  description: 'The GCC’s AI-powered career coaching platform. Discover who you are, where you belong, and exactly how to get there.',
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages}>
      <div dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale} className="contents">
        {children}
      </div>
    </NextIntlClientProvider>
  )
}