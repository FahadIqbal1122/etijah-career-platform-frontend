'use client'

// Is the launch price still on? The backend decides (GET /launch-offer-config -> active): true with no end date or before it,
// false once the Admin end date has passed. formatPrice() reads the same flag, so after the date every price on the site shows
// the standard price. Until the answer arrives the launch price is shown, and the last answer is remembered for the session so
// a visitor after the deadline does not see the old price flash on every page.

import { useEffect, useSyncExternalStore } from 'react'
import { apiGet } from '@/lib/api'
import { isLaunchActive, setLaunchActive, subscribeLaunchActive } from '@/lib/pricing'

const CACHE_KEY = 'launch:active'
let started = false

function start() {
  if (started) return
  started = true
  try {
    const saved = window.sessionStorage.getItem(CACHE_KEY)
    if (saved === '0') setLaunchActive(false)
  } catch { /* no storage */ }
  apiGet<{ active?: boolean }>('/launch-offer-config')
    .then(d => {
      const active = d?.active !== false
      setLaunchActive(active)
      try { window.sessionStorage.setItem(CACHE_KEY, active ? '1' : '0') } catch { /* ignore */ }
    })
    .catch(() => { /* keep what is shown: the backend charges the right price either way */ })
}

/** True while the launch price applies. Re-renders the component when the answer arrives. */
export function useLaunchActive(): boolean {
  useEffect(() => { start() }, [])
  return useSyncExternalStore(subscribeLaunchActive, isLaunchActive, () => true)
}
