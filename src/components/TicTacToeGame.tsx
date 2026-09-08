'use client'

// Tic-tac-toe vs. a simple bot — one of the break-panel activities. Self
// contained: no scoring, no persistence, resets whenever it's unmounted
// (BreakPanel remounts it fresh each time this activity is picked).

import { useEffect, useState } from 'react'
import { breakCopy, Bi } from '@/data/breakActivities'
import { pushTelemetry } from '@/lib/telemetry'

function t(bi: Bi, locale: 'en' | 'ar'): string {
  return locale === 'ar' ? bi.ar : bi.en
}

type Cell = 'X' | 'O' | null

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]

function winnerOf(board: Cell[]): Cell {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a]
  }
  return null
}

// bot plays O: win if possible, else block, else center, else a corner, else anything
function botMove(board: Cell[]): number {
  const empty = board.reduce<number[]>((acc, c, i) => (c ? acc : [...acc, i]), [])
  for (const i of empty) {
    const copy = [...board]; copy[i] = 'O'
    if (winnerOf(copy) === 'O') return i
  }
  for (const i of empty) {
    const copy = [...board]; copy[i] = 'X'
    if (winnerOf(copy) === 'X') return i
  }
  if (board[4] === null) return 4
  const corners = [0, 2, 6, 8].filter(i => board[i] === null)
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)]
  return empty[Math.floor(Math.random() * empty.length)]
}

interface Props { locale: 'en' | 'ar' }

export default function TicTacToeGame({ locale }: Props) {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null))
  const [thinking, setThinking] = useState(false)

  const win = winnerOf(board)
  const full = board.every(c => c !== null)

  useEffect(() => {
    if (!win && !full) return
    pushTelemetry({ event_type: 'break_activity', activity_kind: 'tic_tac_toe', payload: { result: win === 'X' ? 'win' : win === 'O' ? 'lose' : 'draw' } })
  }, [win, full])

  function play(i: number) {
    if (board[i] || win || thinking) return
    const next = [...board]
    next[i] = 'X'
    setBoard(next)
    if (winnerOf(next) || next.every(c => c !== null)) return
    setThinking(true)
    window.setTimeout(() => {
      setBoard(prev => {
        const idx = botMove(prev)
        const copy = [...prev]
        copy[idx] = 'O'
        return copy
      })
      setThinking(false)
    }, 400)
  }

  function reset() {
    setBoard(Array(9).fill(null))
    setThinking(false)
  }

  const status = win === 'X' ? t(breakCopy.youWin, locale)
    : win === 'O' ? t(breakCopy.youLose, locale)
    : full ? t(breakCopy.draw, locale)
    : thinking ? t(breakCopy.botTurn, locale)
    : t(breakCopy.yourTurn, locale)

  return (
    <>
      <div className="ttt-board">
        {board.map((cell, i) => (
          <button
            key={i}
            type="button"
            className="ttt-cell"
            onClick={() => play(i)}
            disabled={!!cell || !!win || thinking}
          >
            {cell}
          </button>
        ))}
      </div>
      <div className="assess-break-status">{status}</div>
      {(win || full) && (
        <div className="assess-break-row">
          <button type="button" className="assess-break-action ghost" onClick={reset}>
            {t(breakCopy.playAgain, locale)}
          </button>
        </div>
      )}
    </>
  )
}
