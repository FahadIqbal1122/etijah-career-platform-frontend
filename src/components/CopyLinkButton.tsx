'use client'

import { useState } from "react"

  export function CopyLinkButton() {
    const [copied, setCopied] = useState(false)
    return (
      <button onClick={() => {
        navigator.clipboard.writeText(window.location.href)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}>
        {copied ? 'Copied!' : 'Copy Link'}
      </button>
    )
  }