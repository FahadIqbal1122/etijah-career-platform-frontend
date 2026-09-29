import createMiddleware from 'next-intl/middleware'
import { NextResponse } from 'next/server'
import {routing} from '@/i18n/routing'
import { CURRENCY_COOKIE, currencyForCountry, isCurrency } from '@/lib/pricing'

const intlMiddleware = createMiddleware(routing)

// Display currency for the visitor, from the CDN's geo header (Cloudflare / Vercel / CloudFront).
// If none of those headers reach the app the cookie is left unset and the UI falls back to SAR.
// `?cur=BHD` overrides for testing / manual switching.
function geoCurrency(request: Parameters<typeof intlMiddleware>[0]): string | null {
    const override = request.nextUrl.searchParams.get('cur')?.toUpperCase()
    if (isCurrency(override)) return override
    const country =
        request.headers.get('cf-ipcountry') ||
        request.headers.get('x-vercel-ip-country') ||
        request.headers.get('cloudfront-viewer-country')
    // 'XX' / 'T1' are Cloudflare's "unknown" / Tor codes.
    if (!country || country === 'XX' || country === 'T1') return null
    return currencyForCountry(country)
}

export function proxy(request: Parameters<typeof intlMiddleware>[0]) {
    const { pathname } = request.nextUrl
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/') || pathname.startsWith('/stats/')) {
        return NextResponse.next()
    }
    const response = intlMiddleware(request)
    const currency = geoCurrency(request)
    if (currency && request.cookies.get(CURRENCY_COOKIE)?.value !== currency) {
        // Readable by client code (no httpOnly) — it's a display preference, not a secret.
        response.cookies.set(CURRENCY_COOKIE, currency, { path: '/', maxAge: 60 * 60 * 24 * 7, sameSite: 'lax' })
    }
    return response
}

export const config = {
    matcher: ['/((?!_next|.*\\..*).*)'],
}
