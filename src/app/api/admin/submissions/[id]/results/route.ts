import { NextRequest, NextResponse } from 'next/server'

const BACKEND = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get('admin_session')?.value
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  const res = await fetch(`${BACKEND}/assessment/${id}/results`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
