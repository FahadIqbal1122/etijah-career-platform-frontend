import { NextRequest, NextResponse } from 'next/server'
  
const BACKEND = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

export async function GET(
  req: NextRequest,                                                                                                                                                                
  { params }: { params: Promise<{ id: string }> }
) {
  if (req.headers.get('x-admin-key') !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const res = await fetch(`${BACKEND}/assessment/${id}/results`)
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}