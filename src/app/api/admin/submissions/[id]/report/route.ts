import { NextRequest, NextResponse } from 'next/server'

const BACKEND = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

// Streams the PDF straight through rather than using backendJsonResponse (that
// helper assumes a JSON body) — an admin needs to preview/download the exact
// same report a user would get, in either locale, without leaving the dashboard.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get('admin_session')?.value
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  const locale = req.nextUrl.searchParams.get('locale') || 'en'
  const res = await fetch(`${BACKEND}/assessment/${id}/report?locale=${locale}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const text = await res.text()
    try {
      return NextResponse.json(JSON.parse(text), { status: res.status })
    } catch {
      return NextResponse.json({ error: `Backend error: ${text.slice(0, 200)}` }, { status: res.status })
    }
  }

  const disposition = res.headers.get('Content-Disposition') || `attachment; filename="career-report-${id.slice(0, 8)}-${locale}.pdf"`
  return new NextResponse(res.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': disposition,
    },
  })
}
