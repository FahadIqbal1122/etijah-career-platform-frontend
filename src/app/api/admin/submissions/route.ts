import { NextRequest, NextResponse } from 'next/server'
import { backendJsonResponse } from '@/lib/adminProxy'

const BACKEND = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin_session')?.value
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const res = await fetch(`${BACKEND}/admin/submissions`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return backendJsonResponse(res)
}
