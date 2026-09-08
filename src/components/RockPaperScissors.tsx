'use client'

// Rock-Paper-Scissors vs. a random bot — one of the break-panel activities.

import { useState } from 'react'
import { breakCopy, RPS_CHOICES, Bi } from '@/data/breakActivities'

function t(bi: Bi, locale: 'en' | 'ar'): string {
  return locale === 'ar' ? bi.ar : bi.en
}

type Choice = 'rock' | 'paper' | 'scissors'

function beats(a: Choice, b: Choice): boolean {
  return (a === 'rock' && b === 'scissors') || (a === 'paper' && b === 'rock') || (a === 'scissors' && b === 'paper')
}

// module-level so the random pick stays out of render — only called from the
// play() event handler below.
function randomBotChoice(): Choice {
  return RPS_CHOICES[Math.floor(Math.random() * RPS_CHOICES.length)].key
}

interface Props { locale: 'en' | 'ar' }

export default function RockPaperScissors({ locale }: Props) {
  const [result, setResult] = useState<{ user: Choice; bot: Choice } | null>(null)

  function play(choice: Choice) {
    setResult({ user: choice, bot: randomBotChoice() })
  }

  function reset() { setResult(null) }

  const emoji = (k: Choice) => RPS_CHOICES.find(c => c.key === k)!.emoji

  if (!result) {
    return (
      <>
        <div className="assess-break-status">{t(breakCopy.pickHand, locale)}</div>
        <div className="rps-choices">
          {RPS_CHOICES.map(c => (
            <button
              key={c.key}
              type="button"
              className="rps-choice"
              aria-label={t(c.label, locale)}
              onClick={() => play(c.key)}
            >
              {c.emoji}
            </button>
          ))}
        </div>
      </>
    )
  }

  const outcome = result.user === result.bot
    ? t(breakCopy.draw, locale)
    : beats(result.user, result.bot) ? t(breakCopy.youWin, locale) : t(breakCopy.youLose, locale)

  return (
    <>
      <div className="rps-vs">{emoji(result.user)} <span>vs</span> {emoji(result.bot)}</div>
      <div className="assess-break-status">{outcome}</div>
      <div className="assess-break-row">
        <button type="button" className="assess-break-action ghost" onClick={reset}>
          {t(breakCopy.playAgain, locale)}
        </button>
      </div>
    </>
  )
}
