import { NextRequest, NextResponse } from 'next/server'
import { backendJsonResponse } from '@/lib/adminProxy'

const BACKEND = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get('admin_session')?.value
  if (!token) return NextResponse.json({ error: 'Not Authenticated' }, { status: 401 })
  const { id } = await params
  const res = await fetch(`${BACKEND}/admin/discount-codes/${encodeURIComponent(id)}/redemptions`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return backendJsonResponse(res)
}
