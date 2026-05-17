import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const COOKIE = 'admin_session'
const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 60 * 60 * 8, // 8 hours
}

async function verifyToken(token: string) {
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  if (user.app_metadata?.role !== 'admin') return null
  return user
}

// Check current session
export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value
  if (!token) return NextResponse.json({ authenticated: false }, { status: 401 })
  const user = await verifyToken(token)
  if (!user) {
    const res = NextResponse.json({ authenticated: false }, { status: 401 })
    res.cookies.delete(COOKIE)
    return res
  }
  return NextResponse.json({ authenticated: true, email: user.email })
}

// Login — client sends token, server sets httpOnly cookie
export async function POST(req: NextRequest) {
  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'No token' }, { status: 400 })
  const user = await verifyToken(token)
  if (!user) return NextResponse.json({ error: 'Invalid or non-admin token' }, { status: 403 })
  const res = NextResponse.json({ ok: true, email: user.email })
  res.cookies.set(COOKIE, token, COOKIE_OPTS)
  return res
}

// Logout
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(COOKIE)
  return res
}
