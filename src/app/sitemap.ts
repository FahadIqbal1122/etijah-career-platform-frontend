import type { MetadataRoute } from 'next'
import { routing } from '@/i18n/routing'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://myetijahi.com').replace(/\/$/, '')

const PUBLIC_PATHS = ['', '/landing', '/waitlist', '/assessment', '/login', '/signup']

export default function sitemap(): MetadataRoute.Sitemap {
    return PUBLIC_PATHS.map((path) => ({
        url: `${SITE_URL}/${routing.defaultLocale}${path}`,
        lastModified: new Date(),
        alternates: {
            languages: Object.fromEntries(
                routing.locales.map((locale) => [locale, `${SITE_URL}/${locale}${path}`])
            ),
        },
    }))
}
