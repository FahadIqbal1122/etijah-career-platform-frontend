import { NextRequest, NextResponse } from "next/server";
import { isRateLimited, clientIp } from '@/lib/rateLimit'

const BACKEND = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

export async function POST(req: NextRequest){
    // Generous limit — unlike the form-submission routes, this fires on every
    // page view/click a visitor makes on the waitlist page, not once per person.
    if (isRateLimited(`waitlist-events:${clientIp(req)}`, 120, 5 * 60 * 1000)) {
        return NextResponse.json({ error: 'Too many requests, please try again later' }, { status: 429 })
    }
    const body = await req.json()
    try {
        const res = await fetch(`${BACKEND}/waitlist/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(15000),
        })
        const data = await res.json()
        return NextResponse.json(data, { status: res.status })
    } catch {
        return NextResponse.json({ error: 'Request failed, please try again' }, { status: 502 })
    }
}
