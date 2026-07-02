import { NextRequest, NextResponse } from 'next/server';
const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_session')?.value
  if (!token) return NextResponse.json({ error: 'Not Authenticated' }, { status: 401 })
  const res = await fetch(`${BACKEND}/admin/market-analysis/fetch`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  return NextResponse.json(await res.json(), { status: res.status })
}
