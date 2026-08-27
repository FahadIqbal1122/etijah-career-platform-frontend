import { NextResponse } from 'next/server'

// Every admin API route under src/app/api/admin/** proxies a backend response
// straight through with `NextResponse.json(await res.json(), { status: res.status })`.
// A backend 502/504/HTML error page isn't valid JSON, so that throws unhandled —
// an admin-panel action then just shows a raw Next.js 500 instead of a clear
// error. Parse defensively and fall back to a readable message instead.
export async function backendJsonResponse(res: Response): Promise<NextResponse> {
  const text = await res.text()
  try {
    return NextResponse.json(text ? JSON.parse(text) : null, { status: res.status })
  } catch {
    return NextResponse.json({ error: `Backend error: ${text.slice(0, 200)}` }, { status: 500 })
  }
}
