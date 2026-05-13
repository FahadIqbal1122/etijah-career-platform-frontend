import createMiddleware from 'next-intl/middleware'
import {routing} from '@/i18n/routing'

const intlMiddleware = createMiddleware(routing)

export function proxy(request: Parameters<typeof intlMiddleware>[0]) {
    console.log('proxy called for:', request.nextUrl.pathname)
    return intlMiddleware(request)
}

export const config = {
    matcher: ['/((?!_next|.*\\..*).*)'],
}