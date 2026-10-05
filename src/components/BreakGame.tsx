'use client'

// The riddle / mini-game content of the old "Play a riddle or game" button, now shown inside the coach's
// panel (CoachWidget). Same activities, copy and telemetry as BreakPanel; the choice of activity is made
// by the parent in an event handler (pickNextGame) so no randomness runs during render.

import { useState } from 'react'
import { RIDDLES, breakCopy, ACTIVITY_LABELS, type BreakActivity, type Bi } from '@/data/breakActivities'
import { pushTelemetry } from '@/lib/telemetry'
import TicTacToeGame from '@/components/TicTacToeGame'
import RockPaperScissors from '@/components/RockPaperScissors'
import MemoryMatch from '@/components/MemoryMatch'

export interface GameState { kind: BreakActivity['kind']; riddleIdx: number; n: number }

const KINDS: BreakActivity['kind'][] = ['riddle', 'tic_tac_toe', 'rps', 'memory_match']
const t = (bi: Bi, locale: 'en' | 'ar') => (locale === 'ar' ? bi.ar : bi.en)

// Random pick that never repeats the previous activity (or riddle). Call from event handlers only.
export function pickNextGame(prev: GameState | null): GameState {
  let kind: BreakActivity['kind']
  do { kind = KINDS[Math.floor(Math.random() * KINDS.length)] } while (prev && KINDS.length > 1 && kind === prev.kind)
  let riddleIdx = prev?.riddleIdx ?? 0
  if (kind === 'riddle' && RIDDLES.length > 1) {
    let next: number
    do { next = Math.floor(Math.random() * RIDDLES.length) } while (next === prev?.riddleIdx)
    riddleIdx = next
  }
  return { kind, riddleIdx, n: (prev?.n ?? 0) + 1 }
}

export default function BreakGame({ locale, game, onAnother, onExit, exitLabel }: {
  locale: 'en' | 'ar'
  game: GameState
  onAnother: () => void
  onExit: () => void
  exitLabel: string
}) {
  // keyed by game.n in the parent, so a new pick starts with the answer hidden
  const [revealed, setRevealed] = useState(false)
  const riddle = RIDDLES[game.riddleIdx]

  return (
    <div className="assess-break coach-game">
      <div className="assess-break-eyebrow">{t(ACTIVITY_LABELS[game.kind], locale)}</div>

      {game.kind === 'riddle' && (
        <>
          <div className="assess-break-prompt">{t(riddle.prompt, locale)}</div>
          {!revealed ? (
            <button
              type="button" className="assess-break-action"
              onClick={() => {
                setRevealed(true)
                pushTelemetry({ event_type: 'break_activity', activity_kind: 'riddle', payload: { riddle_id: riddle.id } })
              }}
            >
              {t(breakCopy.reveal, locale)}
            </button>
          ) : (
            <div className="assess-break-answer">{t(riddle.answer, locale)}</div>
          )}
        </>
      )}

      {game.kind === 'tic_tac_toe' && <TicTacToeGame locale={locale} />}
      {game.kind === 'rps' && <RockPaperScissors locale={locale} />}
      {game.kind === 'memory_match' && <MemoryMatch locale={locale} />}

      <div className="assess-break-row">
        <button type="button" className="assess-break-action ghost" onClick={onAnother}>
          {t(breakCopy.another, locale)}
        </button>
      </div>
      <button type="button" className="assess-break-back" onClick={onExit}>{exitLabel}</button>
    </div>
  )
}
