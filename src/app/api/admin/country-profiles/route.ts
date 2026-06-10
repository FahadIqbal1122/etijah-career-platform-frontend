import { NextRequest, NextResponse } from "next/server";
const BACKEND = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

export async function GET(req: NextRequest) {
    const token = req.cookies.get('admin_session')?.value
    if(!token) return NextResponse.json({ error: 'Not Authenticated' }, {status: 401})
    const res = await fetch(`${BACKEND}/admin/country-profiles`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    return NextResponse.json(await res.json(), {status: res.status})
}

export async function POST(req: NextRequest) {
    const token = req.cookies.get('admin_session')?.value
    if(!token) return NextResponse.json({ error: 'Not Authenticated' }, {status: 401})
    const body = await req.json()
    const res = await fetch(`${BACKEND}/admin/country-profiles`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
    return NextResponse.json(await res.json(), {status: res.status})
}