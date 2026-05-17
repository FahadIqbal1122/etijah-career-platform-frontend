import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/supabase-server'

const BACKEND = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdmin(req)
  if (adminCheck) return adminCheck

  const res = await fetch(`${BACKEND}/admin/submissions`)
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
