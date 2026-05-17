import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/supabase-server'
  
const BACKEND = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

export async function GET(
  req: NextRequest,                                                                                                                                                                
  { params }: { params: Promise<{ id: string }> }
) {
  const deny = await verifyAdmin(req)
  if (deny) return deny

  const { id } = await params
  const res = await fetch(`${BACKEND}/assessment/${id}/results`)
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
