import { NextRequest, NextResponse } from 'next/server'
import { backendJsonResponse } from '@/lib/adminProxy'

const BACKEND = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

// Bulk raw answers + scores for the dashboard's Excel export (admin only; the backend re-checks the role).
export async function POST(req: NextRequest) {
    const token = req.cookies.get('admin_session')?.value
    if (!token) return NextResponse.json({ error: 'Not Authenticated' }, { status: 401 })
    const body = await req.json()
    const res = await fetch(`${BACKEND}/admin/export/assessment-details`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
    return backendJsonResponse(res)
}
