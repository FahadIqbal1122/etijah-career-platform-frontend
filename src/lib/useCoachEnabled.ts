'use client'

// The admin Coach tab's two switches (GET /coach-enabled): Sarah, the coach, and the riddle / games button.
// Both are off by default. `known` is false until the answer arrives; until then both read as off, so neither the
// coach nor the games button flashes on and then disappears. Cached for the page's lifetime, one shared request.

import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'

export type CoachSwitches = { coach: boolean; games: boolean; known: boolean }

const OFF: CoachSwitches = { coach: false, games: false, known: false }
let cached: CoachSwitches | null = null
let inflight: Promise<CoachSwitches> | null = null

function load(): Promise<CoachSwitches> {
  if (!inflight) {
    inflight = apiGet<{ enabled?: boolean; games?: boolean }>('/coach-enabled')
      .then(d => (cached = { coach: d?.enabled === true, games: d?.games === true, known: true }))
      .catch(() => (cached = { coach: false, games: false, known: true }))
  }
  return inflight
}

export function useCoachSwitches(): CoachSwitches {
  const [value, setValue] = useState<CoachSwitches>(cached ?? OFF)
  useEffect(() => {
    let live = true
    if (!cached) load().then(v => { if (live) setValue(v) })
    return () => { live = false }
  }, [])
  return value
}

// Just the coach switch (kept for callers that only need it).
export function useCoachEnabled(): boolean {
  return useCoachSwitches().coach
}
