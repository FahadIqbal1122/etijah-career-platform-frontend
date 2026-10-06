import { useSyncExternalStore } from 'react'

// A page can pin the site language (e.g. an assessment taken in Arabic stays Arabic), and the
// header language switcher reads this to hide the other language.
let locked: 'en' | 'ar' | null = null
const listeners = new Set<() => void>()

export function setLocaleLock(next: 'en' | 'ar' | null) {
  if (locked === next) return
  locked = next
  listeners.forEach(l => l())
}

export function useLocaleLock() {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => { listeners.delete(cb) } },
    () => locked,
    () => null,
  )
}
