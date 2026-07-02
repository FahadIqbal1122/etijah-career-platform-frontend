import { NextRequest, NextResponse } from 'next/server';
const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

export const maxDuration = 120

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_session')?.value
  if (!token) return NextResponse.json({ error: 'Not Authenticated' }, { status: 401 })
  const res = await fetch(`${BACKEND}/admin/market-analysis/fetch`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(110_000),
  })
  const text = await res.text()
  try {
    return NextResponse.json(JSON.parse(text), { status: res.status })
  } catch {
    return NextResponse.json({ error: `Backend error: ${text.slice(0, 200)}` }, { status: 500 })
  }
}
