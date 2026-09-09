'use client'

import { useState } from 'react'
import { apiAuthPost } from '@/lib/api'
import { resultStageIntro, resultStageQuestions, type Locale } from './content'
import { PillSelect } from './shared'

type Answers = Partial<Record<'result_accuracy' | 'would_recommend' | 'would_pay', string>>

function resultStageDoneKey(responseId: string) {
  return `betaResultStageDone:${responseId}`
}

export default function BetaFeedbackResultStage({ responseId, locale, initiallyDone }: {
  responseId: string
  locale: Locale
  // Server-truth flag from /beta-feedback/{id}/status — covers a cleared/
  // private-mode browser where the client-side "done" marker below wouldn't
  // otherwise be seen, same reasoning as BetaFeedbackStage1.
  initiallyDone?: boolean
}) {
  const [answers, setAnswers] = useState<Answers>({})
  const [done, setDone] = useState(() => {
    if (initiallyDone) return true
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(resultStageDoneKey(responseId)) === '1'
  })

  function answer(key: keyof Answers, value: string) {
    const next = { ...answers, [key]: value }
    setAnswers(next)
    const save = apiAuthPost('/beta-feedback/result-stage', { response_id: responseId, locale, ...next })
    const isLast = Object.keys(next).length >= resultStageQuestions.length
    if (isLast) {
      save.finally(() => {
        window.localStorage.setItem(resultStageDoneKey(responseId), '1')
        setDone(true)
      })
    } else {
      // Non-final answers are fire-and-forget — non-blocking, so someone who
      // never finishes still has whatever partial answers they gave saved.
      save.catch(() => {})
    }
  }

  if (done || initiallyDone) return null

  return (
    <div className="card p-5" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <p className="text-sm font-bold text-charcoal mb-3">{resultStageIntro[locale]}</p>
      <div>
        {resultStageQuestions.map(q => (
          <PillSelect
            key={q.key}
            label={q.label[locale]}
            options={q.options}
            value={answers[q.key]}
            onChange={v => answer(q.key, v)}
            locale={locale}
          />
        ))}
      </div>
    </div>
  )
}
