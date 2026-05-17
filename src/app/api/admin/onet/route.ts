import { NextRequest, NextResponse } from 'next/server'

const BACKEND = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin_session')?.value
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const res = await fetch(`${BACKEND}/onet`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_session')?.value
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json()
  const res = await fetch(`${BACKEND}/onet`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
