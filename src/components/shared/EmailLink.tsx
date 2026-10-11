'use client'
import type { ReactNode } from 'react'

// Address is split so Cloudflare's email obfuscation can't find/rewrite it in the HTML
// (that rewrite breaks mailto links after React hydrates).
const USER = 'info'
const HOST = 'myetijahi.com'

export default function EmailLink({ className, onClick, children }: { className?: string; onClick?: () => void; children?: ReactNode }) {
  return (
    <a
      href="#"
      className={className}
      onClick={e => { e.preventDefault(); onClick?.(); window.location.href = `mailto:${USER}@${HOST}` }}
    >
      {children ?? `${USER}@${HOST}`}
    </a>
  )
}
