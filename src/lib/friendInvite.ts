// Friend comparison switch. The invite button on the pay gate shows when NEXT_PUBLIC_FRIEND_INVITE=1, or, for testers,
// after opening the assessment once with ?friend=1 (remembered for the browser session).
export const FRIEND_KEY = 'etijahi:friend'                 // the invite token the friend opened
export const FRIEND_CONSENT_KEY = 'etijahi:friend-consent' // holds the same token once the friend agreed on the invite page
const TEST_KEY = 'friend:test'

export function friendInviteOn(): boolean {
  if (process.env.NEXT_PUBLIC_FRIEND_INVITE === '1') return true
  try {
    if (new URLSearchParams(window.location.search).get('friend') === '1') window.sessionStorage.setItem(TEST_KEY, '1')
    return window.sessionStorage.getItem(TEST_KEY) === '1'
  } catch { return false }
}
