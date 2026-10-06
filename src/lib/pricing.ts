// Local pricing by visitor country, shown only while the admin Currency switch is on (otherwise SAR only, see
// useDisplayCurrency). The backend charges from its own LOCAL_PRICES table in main.py, so update both together
// when prices change. SAR is the base price (PLAN_CATALOG).

export type Currency = 'SAR' | 'BHD' | 'QAR' | 'KWD' | 'OMR' | 'AED' | 'USD'
export type PriceKey = 'pathfinder' | 'pathfinder_standard' | 'launchpad' | 'launchpad_standard'

export const CURRENCY_COOKIE = 'etj_cur'

// Visitor's country (ISO-2, from the CDN geo header) -> display currency. Everyone else -> USD.
export const COUNTRY_CURRENCY: Record<string, Currency> = {
  SA: 'SAR', BH: 'BHD', QA: 'QAR', KW: 'KWD', OM: 'OMR', AE: 'AED',
}

// Rounded from the pegged rates (1 USD = 3.75 SAR, 0.376 BHD, 3.64 QAR, 0.307 KWD, 0.385 OMR, 3.6725 AED).
export const PRICES: Record<PriceKey, Record<Currency, number>> = {
  pathfinder:          { SAR: 59,  BHD: 6,  QAR: 58,  KWD: 5,   OMR: 6,  AED: 58,  USD: 16 },
  pathfinder_standard: { SAR: 99,  BHD: 10, QAR: 96,  KWD: 8,   OMR: 10, AED: 97,  USD: 26 },
  // launchpad:           { SAR: 440, BHD: 44, QAR: 428, KWD: 36,  OMR: 45, AED: 431, USD: 117 },
  // Launchpad launch offer: 330 SAR (standard 440 SAR, kept as launchpad_standard for the crossed-out price)
  launchpad:           { SAR: 330, BHD: 33, QAR: 321, KWD: 27,  OMR: 34, AED: 323, USD: 88 },
  launchpad_standard:  { SAR: 440, BHD: 44, QAR: 428, KWD: 36,  OMR: 45, AED: 431, USD: 117 },
}

const AR_NAMES: Record<Currency, string> = {
  SAR: 'ريال', BHD: 'دينار بحريني', QAR: 'ريال قطري', KWD: 'دينار كويتي',
  OMR: 'ريال عماني', AED: 'درهم', USD: 'دولار',
}

export function isCurrency(v: string | null | undefined): v is Currency {
  return !!v && v in AR_NAMES
}

export function currencyForCountry(country: string | null | undefined): Currency {
  return COUNTRY_CURRENCY[(country || '').toUpperCase()] ?? 'USD'
}

export function formatPrice(key: PriceKey, currency: Currency, locale: string): string {
  const n = PRICES[key][currency]
  if (locale === 'ar') {
    return `${n.toLocaleString('ar-EG', { maximumFractionDigits: 1 })} ${AR_NAMES[currency]}`
  }
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 1 })} ${currency}`
}

// Client-side read of the cookie the proxy sets. Returns null on the server or when unset.
export function readCurrencyCookie(): Currency | null {
  if (typeof document === 'undefined') return null
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${CURRENCY_COOKIE}=([^;]*)`))
    const v = m ? decodeURIComponent(m[1]) : null
    return isCurrency(v) ? v : null
  } catch {
    return null
  }
}
