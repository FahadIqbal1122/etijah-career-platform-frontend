import createMiddleware from 'next-intl/middleware'
import { NextResponse } from 'next/server'
import {routing} from '@/i18n/routing'

const intlMiddleware = createMiddleware(routing)

export function proxy(request: Parameters<typeof intlMiddleware>[0]) {
    const { pathname } = request.nextUrl
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/')) {
        return NextResponse.next()
    }
    return intlMiddleware(request)
}

export const config = {
    matcher: ['/((?!_next|.*\\..*).*)'],
}