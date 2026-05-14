import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
  
function getSupabase() {
    return createClient(
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_KEY!
    )
}

export async function GET(req: NextRequest) {
    if (req.headers.get('x-admin-key') !== process.env.ADMIN_PASSWORD)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = getSupabase()

    const { data: links, error } = await supabase
      .from('onet_links')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const emails = links?.map(l => l.email) ?? []
    let assessmentEmails: string[] = []

    if (emails.length > 0) {
      const { data } = await supabase
        .from('assessment_responses')
        .select('email')
        .in('email', emails)
        .eq('completed', true)
      assessmentEmails = data?.map(r => r.email) ?? []
    }

    return NextResponse.json(
      links?.map(link => ({ ...link, has_assessment: assessmentEmails.includes(link.email) }))
    )
}

export async function POST(req: NextRequest) {
    if (req.headers.get('x-admin-key') !== process.env.ADMIN_PASSWORD)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { email, onet_url, label } = await req.json()
  
    if (!email || !onet_url)
      return NextResponse.json({ error: 'email and onet_url are required' }, { status: 400 })

    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('onet_links')
      .insert({ email: email.toLowerCase().trim(), onet_url, label })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
}
