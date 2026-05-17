import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
)

export async function verifyAdmin(req: NextRequest): Promise<NextResponse | null> {
    const token = req.cookies.get('sb-admin-token')?.value
    if (!token) return NextResponse.json({ error: 'No token' }, { status: 401 })

    try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
        if (error) return NextResponse.json({ error: `Auth error: ${error.message}` }, { status: 403 })
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 403 })
        if (user.app_metadata?.role !== 'admin') return NextResponse.json({ error: 'Not admin' }, { status: 403 })
    } catch (e: any) {
        return NextResponse.json({ error: `Exception: ${e.message}` }, { status: 500 })
    }

    return null
}