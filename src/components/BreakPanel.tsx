'use client'

// Opt-in "break" panel — lives in the assessment's desktop-only aside,
// swapping the ambient eyebrow/progress text for a random riddle or mini
// game on request. Entirely local UI state: never touches answers, drafts,
// or scoring.

import { useRef, useState } from 'react'
import { RIDDLES, breakCopy, ACTIVITY_LABELS, BreakActivity, Bi } from '@/data/breakActivities'
import TicTacToeGame from '@/components/TicTacToeGame'
import RockPaperScissors from '@/components/RockPaperScissors'
import MemoryMatch from '@/components/MemoryMatch'

function t(bi: Bi, locale: 'en' | 'ar'): string {
  return locale === 'ar' ? bi.ar : bi.en
}

const KINDS: BreakActivity['kind'][] = ['riddle', 'tic_tac_toe', 'rps', 'memory_match']

// module-level (not component-body) so the random calls stay out of render —
// only ever invoked from event handlers below, never during render itself.
function pickRandomRiddleIdx(excluding: number | null): number {
  if (RIDDLES.length <= 1) return 0
  let next: number
  do { next = Math.floor(Math.random() * RIDDLES.length) }
  while (next === excluding)
  return next
}

function pickRandomKind(excluding: BreakActivity['kind'] | null): BreakActivity['kind'] {
  let next: BreakActivity['kind']
  do { next = KINDS[Math.floor(Math.random() * KINDS.length)] }
  while (next === excluding)
  return next
}

interface BreakPanelProps {
  locale: 'en' | 'ar'
  eyebrow: string
  progressMsg: string
  questionIndex: number
  // mobile slot: the eyebrow/progress text is already shown separately
  // (.assess-progress-label) above this panel, so skip it here to avoid
  // showing the same line twice — just the trigger button, then the game.
  compact?: boolean
}

export default function BreakPanel({ locale, eyebrow, progressMsg, questionIndex, compact }: BreakPanelProps) {
  const [activeKind, setActiveKind] = useState<BreakActivity['kind'] | null>(null)
  const [riddleIdx, setRiddleIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const lastRiddleRef = useRef<number | null>(null)
  const lastKindRef = useRef<BreakActivity['kind'] | null>(null)

  // a fresh question always starts back on the encouragement text, so an
  // open activity can't linger stale through a reveal takeover. Adjusting
  // state during render (rather than in a useEffect) per React's guidance
  // for "resetting state when a prop changes" — avoids an extra render pass.
  const [prevQuestionIndex, setPrevQuestionIndex] = useState(questionIndex)
  if (questionIndex !== prevQuestionIndex) {
    setPrevQuestionIndex(questionIndex)
    if (activeKind !== null) setActiveKind(null)
  }

  function pickRiddle() {
    const next = pickRandomRiddleIdx(lastRiddleRef.current)
    lastRiddleRef.current = next
    setRiddleIdx(next)
    setRevealed(false)
  }

  // picks a random activity kind, never repeating the one just shown
  function pickActivity() {
    const next = pickRandomKind(lastKindRef.current)
    lastKindRef.current = next
    if (next === 'riddle') pickRiddle()
    setActiveKind(next)
  }

  function closeBreak() {
    setActiveKind(null)
    setRevealed(false)
  }

  if (!activeKind) {
    if (compact) {
      return (
        <button type="button" className="assess-break-trigger" onClick={pickActivity}>
          {t(breakCopy.trigger, locale)}
        </button>
      )
    }
    return (
      <>
        <div className="assess-aside-eyebrow">{eyebrow}</div>
        {progressMsg && <div className="assess-aside-progress-msg">{progressMsg}</div>}
        <button type="button" className="assess-break-trigger" onClick={pickActivity}>
          {t(breakCopy.trigger, locale)}
        </button>
      </>
    )
  }

  const riddle = RIDDLES[riddleIdx]

  return (
    <div className="assess-break">
      <div className="assess-break-eyebrow">{t(ACTIVITY_LABELS[activeKind], locale)}</div>

      {activeKind === 'riddle' && (
        <>
          <div className="assess-break-prompt">{t(riddle.prompt, locale)}</div>
          {!revealed ? (
            <button type="button" className="assess-break-action" onClick={() => setRevealed(true)}>
              {t(breakCopy.reveal, locale)}
            </button>
          ) : (
            <>
              <div className="assess-break-answer">{t(riddle.answer, locale)}</div>
              <div className="assess-break-row">
                <button type="button" className="assess-break-action ghost" onClick={pickRiddle}>
                  {t(breakCopy.nextRiddle, locale)}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {activeKind === 'tic_tac_toe' && <TicTacToeGame locale={locale} />}
      {activeKind === 'rps' && <RockPaperScissors locale={locale} />}
      {activeKind === 'memory_match' && <MemoryMatch locale={locale} />}

      <div className="assess-break-row">
        <button type="button" className="assess-break-action ghost" onClick={pickActivity}>
          {t(breakCopy.another, locale)}
        </button>
      </div>
      <button type="button" className="assess-break-back" onClick={closeBreak}>
        {t(breakCopy.back, locale)}
      </button>
    </div>
  )
}
