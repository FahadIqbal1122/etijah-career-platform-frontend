'use client'

import { useEffect, useState } from 'react'
import { readCurrencyCookie, type Currency } from './pricing'

// Admin switch (Admin → Currency). Off = every price shown in SAR only. Fetched once per page load.
let multiCurrencyFlag: Promise<boolean> | null = null
function fetchMultiCurrencyEnabled(): Promise<boolean> {
  if (!multiCurrencyFlag) {
    const base = (process.env.NEXT_PUBLIC_API_URL || 'https://backend-career-compass.etijahcoaching.com').replace(/\/$/, '')
    multiCurrencyFlag = fetch(`${base}/multi-currency`)
      .then(r => (r.ok ? r.json() : { enabled: false }))
      .then(d => d?.enabled === true)
      .catch(() => false)
  }
  return multiCurrencyFlag
}

// The currency prices are shown in: SAR unless the admin switch is on, then the visitor's local currency.
export function useDisplayCurrency(): Currency {
  const [currency, setCurrency] = useState<Currency>('SAR')
  useEffect(() => {
    let cancelled = false
    fetchMultiCurrencyEnabled().then(on => {
      if (!cancelled) setCurrency(on ? (readCurrencyCookie() ?? 'SAR') : 'SAR')
    })
    return () => { cancelled = true }
  }, [])
  return currency
}
