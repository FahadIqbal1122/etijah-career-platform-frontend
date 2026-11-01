'use client'

// "Continue with Google" through Google Identity Services: a popup that carries our own app name, then the ID token goes
// straight to Supabase. No redirect via <project>.supabase.co, so that address is never shown to the person signing up.
import { useRef } from 'react'
import Script from 'next/script'
import { useLocale } from 'next-intl'
import { supabase } from '@/lib/supabase'

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function GoogleButton({ onDone, onError, tracking }: {
  onDone: () => void
  onError: (message: string) => void
  tracking?: string
}) {
  const locale = useLocale()
  const box = useRef<HTMLDivElement>(null)
  // latest callbacks, so the handler Google holds never calls a stale one
  const cb = useRef({ onDone, onError })
  cb.current = { onDone, onError }

  async function init() {
    const g = (window as any).google // eslint-disable-line @typescript-eslint/no-explicit-any
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!g?.accounts?.id || !box.current || !clientId) return
    const rawNonce = crypto.randomUUID()
    g.accounts.id.initialize({
      client_id: clientId,
      nonce: await sha256Hex(rawNonce),
      callback: async (resp: { credential: string }) => {
        const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: resp.credential, nonce: rawNonce })
        if (error) cb.current.onError(error.message); else cb.current.onDone()
      },
    })
    box.current.innerHTML = ''
    g.accounts.id.renderButton(box.current, { theme: 'outline', size: 'large', width: 280, text: 'continue_with', locale })
  }

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={() => { void init() }} />
      <div ref={box} className="flex justify-center min-h-[44px]" data-track={tracking} />
    </>
  )
}
