  'use client'

  import { useEffect, useState } from 'react'
  import LanguageSwitcher from './LanguageSwitcher'
  import { Link } from '@/i18n/navigation'
  import { supabase } from '@/lib/supabase'

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
      <header className="fixed top-0 left-0 right-0 z-20 bg-white border-b border-gray-200 h-14 flex items-center px-6">
        <div className="max-w-2xl mx-auto w-full flex justify-between items-center">
          <span className="font-semibold text-gray-800">Etijah</span>
        <div className="flex items-center gap-4">
          {loggedIn && (
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">Dashboard</Link>
          )}
          <LanguageSwitcher />
        </div>
        </div>
      </header>
    )
  }