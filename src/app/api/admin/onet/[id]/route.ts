import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
    if (req.headers.get('x-admin-key') !== process.env.ADMIN_PASSWORD)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
  
    const supabase = createClient(
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_KEY!
    )

    const { error } = await supabase.from('onet_links').delete().eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return new NextResponse(null, { status: 204 })
}