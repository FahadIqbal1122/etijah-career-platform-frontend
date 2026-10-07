'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Where the "upgrade" buttons on a results page go. Someone who is signed in goes to the plans. Someone who is not
// goes to sign-up first, carrying this report's id, so the report is saved to their account before they pay
// (the sign-up page attaches it with the claim token this browser got when it took the assessment).
export function useUpgradeHref(): string {
  const { id } = useParams<{ id: string }>()
  const [anonymous, setAnonymous] = useState(false)
  useEffect(() => {
    let live = true
    supabase.auth.getSession().then(({ data: { session } }) => { if (live) setAnonymous(!session) }).catch(() => {})
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { if (live) setAnonymous(!session) })
    return () => { live = false; sub.subscription.unsubscribe() }
  }, [])
  return anonymous && id ? `/signup?claim=${encodeURIComponent(id)}` : '/#pricing'
}
