import { NextRequest, NextResponse } from "next/server";
import { backendJsonResponse } from '@/lib/adminProxy';
const BACKEND = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

export async function PUT(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
    const token = req.cookies.get('admin_session')?.value
    if (!token) return NextResponse.json({ error: 'Not Authenticated' }, { status: 401 })
    const { key } = await params
    const body = await req.json()
    const res = await fetch(`${BACKEND}/admin/email-templates/${key}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
    return backendJsonResponse(res)
}
