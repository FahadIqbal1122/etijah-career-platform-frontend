import { NextRequest, NextResponse } from "next/server";
const BACKEND = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

export async function PUT(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    const token = req.cookies.get('admin_session')?.value
    if (!token) return NextResponse.json({ error: 'Not Authenticated' }, { status: 401 })
    const { code } = await params
    const body = await req.json()
    const res = await fetch(`${BACKEND}/admin/country-profiles/${code}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
    return NextResponse.json(await res.json(), { status: res.status })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
    const token = req.cookies.get('admin_session')?.value
    if (!token) return NextResponse.json({ error: 'Not Authenticated' }, { status: 401 })
    const { code } = await params
    const res = await fetch(`${BACKEND}/admin/country-profiles/${code}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    })
    return NextResponse.json(await res.json(), { status: res.status })
}