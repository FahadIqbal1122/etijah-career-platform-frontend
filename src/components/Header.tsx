'use client'

import { useEffect, useState } from 'react'
import LanguageSwitcher from './LanguageSwitcher'
import { Link } from '@/i18n/navigation'
import { supabase } from '@/lib/supabase'
import { Wordmark } from '@/components/brand/Logomark'

export default function Header() {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-[var(--line)]">
      <div className="max-w-6xl mx-auto w-full h-16 px-5 flex items-center justify-between">
        <Link href="/" aria-label="Etijahi home"><Wordmark size={28} /></Link>
        <div className="flex items-center gap-4">
          {loggedIn && (
            <Link href="/dashboard" className="text-sm font-medium text-charcoal/60 hover:text-primary">Dashboard</Link>
          )}
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  )
}
