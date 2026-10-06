import { NextRequest, NextResponse } from "next/server";
import { isRateLimited, clientIp } from '@/lib/rateLimit'

const BACKEND = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

export async function POST(req: NextRequest){
    if (isRateLimited(`featured-course:${clientIp(req)}`, 120, 5 * 60 * 1000)) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const body = await req.json()
    try {
        const res = await fetch(`${BACKEND}/featured-course/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(15000),
        })
        const data = await res.json()
        return NextResponse.json(data, { status: res.status })
    } catch {
        return NextResponse.json({ error: 'Request failed' }, { status: 502 })
    }
}
