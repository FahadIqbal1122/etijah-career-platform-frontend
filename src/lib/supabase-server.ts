import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
)

export async function verifyAdmin(req: NextRequest): Promise<NextResponse | null> {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized'}, {status: 401})

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !user || user.app_metadata?.role !== 'admin') 
        return NextResponse.json({ error: 'Forbidden' }, {  status: 403 })

    return null
}