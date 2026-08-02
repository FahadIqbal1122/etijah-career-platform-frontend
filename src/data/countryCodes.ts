// ISO 3166-1 alpha-2 codes for every country. Display names are resolved at
// render time via Intl.DisplayNames so they come out localized (English or
// Arabic) without us hand-maintaining a translated name list.
export const COUNTRY_CODES = [
  'AF', 'AL', 'DZ', 'AD', 'AO', 'AG', 'AR', 'AM', 'AU', 'AT',
  'AZ', 'BS', 'BH', 'BD', 'BB', 'BY', 'BE', 'BZ', 'BJ', 'BT',
  'BO', 'BA', 'BW', 'BR', 'BN', 'BG', 'BF', 'BI', 'CV', 'KH',
  'CM', 'CA', 'CF', 'TD', 'CL', 'CN', 'CO', 'KM', 'CG', 'CD',
  'CR', 'CI', 'HR', 'CU', 'CY', 'CZ', 'DK', 'DJ', 'DM', 'DO',
  'EC', 'EG', 'SV', 'GQ', 'ER', 'EE', 'SZ', 'ET', 'FJ', 'FI',
  'FR', 'GA', 'GM', 'GE', 'DE', 'GH', 'GR', 'GD', 'GT', 'GN',
  'GW', 'GY', 'HT', 'HN', 'HU', 'IS', 'IN', 'ID', 'IR', 'IQ',
  'IE', 'IL', 'IT', 'JM', 'JP', 'JO', 'KZ', 'KE', 'KI', 'KW',
  'KG', 'LA', 'LV', 'LB', 'LS', 'LR', 'LY', 'LI', 'LT', 'LU',
  'MG', 'MW', 'MY', 'MV', 'ML', 'MT', 'MH', 'MR', 'MU', 'MX',
  'FM', 'MD', 'MC', 'MN', 'ME', 'MA', 'MZ', 'MM', 'NA', 'NR',
  'NP', 'NL', 'NZ', 'NI', 'NE', 'NG', 'KP', 'MK', 'NO', 'OM',
  'PK', 'PW', 'PS', 'PA', 'PG', 'PY', 'PE', 'PH', 'PL', 'PT',
  'QA', 'RO', 'RU', 'RW', 'KN', 'LC', 'VC', 'WS', 'SM', 'ST',
  'SA', 'SN', 'RS', 'SC', 'SL', 'SG', 'SK', 'SI', 'SB', 'SO',
  'ZA', 'KR', 'SS', 'ES', 'LK', 'SD', 'SR', 'SE', 'CH', 'SY',
  'TW', 'TJ', 'TZ', 'TH', 'TL', 'TG', 'TO', 'TT', 'TN', 'TR',
  'TM', 'TV', 'UG', 'UA', 'AE', 'GB', 'US', 'UY', 'UZ', 'VU',
  'VA', 'VE', 'VN', 'YE', 'ZM', 'ZW',
] as const

// `value` is always the canonical English name (so stored/aggregated data stays
// consistent across locales); `label` is localized for display.
export function getCountryOptions(locale: string): { value: string; label: string }[] {
  const en = new Intl.DisplayNames(['en'], { type: 'region' })
  const display = locale === 'ar' ? new Intl.DisplayNames(['ar'], { type: 'region' }) : en
  return COUNTRY_CODES
    .map((code) => ({ value: en.of(code) || code, label: display.of(code) || code }))
    .sort((a, b) => a.label.localeCompare(b.label, locale === 'ar' ? 'ar' : 'en'))
}
