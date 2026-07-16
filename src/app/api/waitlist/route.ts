import { NextRequest, NextResponse } from "next/server";

const BACKEND = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

export async function POST(req: NextRequest){
    const body = await req.json()
    const res = await fetch(`${BACKEND}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
}
