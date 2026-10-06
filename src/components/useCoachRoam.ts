'use client'

// Results page: Sarah wanders from section to section of the report and says a short line about each. Which
// section, when, and which line are all random (sections she has not visited yet come first, lines are not
// repeated until a section has used them all), so every visit looks different. She waits while the chat is open,
// and moves on early if the reader scrolls her section out of view.
// useCoachHidden remembers (in this browser) that someone pressed her cross, on every page that uses her.

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { Bi } from '@/data/coachMessages'

const HIDE_KEY = 'sarahHidden'
const HIDE_EVENT = 'sarah-hidden-change'
export function useCoachHidden(): [boolean, () => void, () => void] {
  const hidden = useSyncExternalStore(
    cb => { window.addEventListener(HIDE_EVENT, cb); return () => window.removeEventListener(HIDE_EVENT, cb) },
    () => { try { return window.localStorage.getItem(HIDE_KEY) === '1' } catch { return false } },
    () => false,
  )
  const hide = useCallback(() => {
    try { window.localStorage.setItem(HIDE_KEY, '1') } catch {}
    window.dispatchEvent(new Event(HIDE_EVENT))
  }, [])
  // bringing her back also forgets where she was docked, so she starts roaming again
  const show = useCallback(() => {
    try { window.localStorage.removeItem(HIDE_KEY); window.localStorage.removeItem('sarahDock') } catch {}
    window.dispatchEvent(new Event(HIDE_EVENT)); window.dispatchEvent(new Event('sarah-dock-change'))
  }, [])
  return [hidden, hide, show]
}

// useCoachDock remembers where someone dragged her: a side of the screen and a height. While she is docked she
// stops roaming and stays put.
export type CoachDock = { side: 'l' | 'r'; y: number }
const DOCK_KEY = 'sarahDock'
const DOCK_EVENT = 'sarah-dock-change'
export function useCoachDock(): [CoachDock | null, (d: CoachDock) => void] {
  const raw = useSyncExternalStore(
    cb => { window.addEventListener(DOCK_EVENT, cb); return () => window.removeEventListener(DOCK_EVENT, cb) },
    () => { try { return window.localStorage.getItem(DOCK_KEY) } catch { return null } },
    () => null,
  )
  const dock = useMemo<CoachDock | null>(() => {
    try {
      const d = raw ? JSON.parse(raw) : null
      return d && (d.side === 'l' || d.side === 'r') && typeof d.y === 'number' ? d : null
    } catch { return null }
  }, [raw])
  const setDock = useCallback((d: CoachDock) => {
    try { window.localStorage.setItem(DOCK_KEY, JSON.stringify(d)) } catch {}
    window.dispatchEvent(new Event(DOCK_EVENT))
  }, [])
  return [dock, setDock]
}

// module-level so the default is the same array on every render (it is an effect dependency)
const DEFAULT_GAP: [number, number] = [11000, 20000]

const rand = (a: number, b: number) => a + Math.random() * (b - a)

function onScreen(el: HTMLElement) {
  if (el.offsetParent === null) return false
  if (el.querySelector(':scope > .report-section-body[hidden]')) return false   // folded away
  const r = el.getBoundingClientRect()
  return r.height > 90 && r.top < window.innerHeight - 170 && r.bottom > 170
}

export function useCoachRoam({ pool, enabled, paused, firstDelay = 3000, gap = DEFAULT_GAP }: {
  pool: Record<string, Bi[]> | null; enabled: boolean; paused: boolean; firstDelay?: number; gap?: [number, number]
}) {
  const [target, setTarget] = useState<HTMLElement | null>(null)
  const [tip, setTip] = useState<Bi | null>(null)
  const [key, setKey] = useState<string | null>(null)
  const dismiss = useCallback(() => setTip(null), [])

  useEffect(() => {
    if (!enabled || paused || !pool) return
    const seen = new Set<string>()
    const used: Record<string, Set<number>> = {}
    let last: string | null = null
    let current: HTMLElement | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    let tipTimer: ReturnType<typeof setTimeout> | undefined
    let first = true

    const candidates = () => [...document.querySelectorAll<HTMLElement>('[data-coach]')]
      .filter(el => (pool[el.dataset.coach!]?.length ?? 0) > 0 && onScreen(el))

    const step = () => {
      // she stays put while the reader is chatting with her
      if (document.querySelector('.coach-panel')) { timer = setTimeout(step, 4000); return }
      const all = candidates()
      if (!all.length) { timer = setTimeout(step, 2500); return }
      const fresh = all.filter(el => !seen.has(el.dataset.coach!))
      const others = all.filter(el => el.dataset.coach !== last)
      const from = fresh.length ? fresh : others.length ? others : all
      const el = from[Math.floor(Math.random() * from.length)]
      const key = el.dataset.coach!
      const lines = pool[key]
      const u = (used[key] ??= new Set())
      if (u.size >= lines.length) u.clear()
      const free = lines.map((_, i) => i).filter(i => !u.has(i))
      const pick = free[Math.floor(Math.random() * free.length)]
      u.add(pick)
      seen.add(key); last = key; current = el
      setTip(null)
      setTarget(el)
      setKey(key)
      clearTimeout(tipTimer)
      tipTimer = setTimeout(() => setTip(lines[pick]), first ? 1700 : 1200)   // after she has arrived
      timer = setTimeout(step, rand(gap[0], gap[1]))
      first = false
    }

    // The reader scrolled her section away: don't leave her stranded, move on soon.
    let scrollTimer: ReturnType<typeof setTimeout> | undefined
    const onScroll = () => {
      clearTimeout(scrollTimer)
      scrollTimer = setTimeout(() => {
        if (current && !onScreen(current)) { clearTimeout(timer); timer = setTimeout(step, 600) }
      }, 500)
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    timer = setTimeout(step, firstDelay)
    return () => {
      clearTimeout(timer); clearTimeout(tipTimer); clearTimeout(scrollTimer)
      window.removeEventListener('scroll', onScroll)
    }
  }, [pool, enabled, paused, firstDelay, gap])

  return { target, tip, dismiss, key }
}
