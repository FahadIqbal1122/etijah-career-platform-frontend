import { NextRequest, NextResponse } from 'next/server'

const BACKEND = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get('admin_session')?.value
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  const res = await fetch(`${BACKEND}/assessment/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return NextResponse.json(await res.json(), { status: res.status })
  return new NextResponse(null, { status: 204 })
}
