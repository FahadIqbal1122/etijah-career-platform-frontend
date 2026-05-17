import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/supabase-server'

const BACKEND = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

export async function GET(req: NextRequest) {
  const deny = await verifyAdmin(req)
  if (deny) return deny

  const res = await fetch(`${BACKEND}/onet`)
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function POST(req: NextRequest) {
  const deny = await verifyAdmin(req)
  if (deny) return deny

  const body = await req.json()
  const res = await fetch(`${BACKEND}/onet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
