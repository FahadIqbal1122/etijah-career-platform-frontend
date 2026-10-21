import { NextRequest, NextResponse } from 'next/server'
import { backendJsonResponse } from '@/lib/adminProxy'

const BACKEND = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ domainId: string; userId: string }> }
) {
  const token = req.cookies.get('admin_session')?.value
  if (!token) return NextResponse.json({ error: 'Not Authenticated' }, { status: 401 })
  const { domainId, userId } = await params
  const res = await fetch(`${BACKEND}/admin/org-domains/${encodeURIComponent(domainId)}/grants/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return backendJsonResponse(res)
}
