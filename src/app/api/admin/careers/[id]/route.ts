import { NextRequest, NextResponse } from 'next/server'
import { backendJsonResponse } from '@/lib/adminProxy'
const BACKEND = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const token = req.cookies.get('admin_session')?.value
    if (!token) return NextResponse.json({ error: 'Not Authenticated' }, { status: 401 })
    const { id } = await params
    const body = await req.json()
    const res = await fetch(`${BACKEND}/admin/careers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
    })
    return backendJsonResponse(res)
}
