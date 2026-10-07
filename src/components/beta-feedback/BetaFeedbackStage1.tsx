'use client'

import { useEffect, useState } from 'react'
import { apiAuthPost } from '@/lib/api'
import { FACE_EMOJIS, STAGE1_FORM_VERSION, stage1Intro, stage1Thanks, stage1Questions, type Locale } from './content'

type Answers = Record<string, number | string>
const TOTAL_STAGE1_QUESTIONS = stage1Questions.length

function stage1DoneKey(responseId: string) {
  return `betaStage1Done:${responseId}`
}

export default function BetaFeedbackStage1({ responseId, locale, onAnswered, onComplete }: {
  responseId: string
  locale: Locale
  onAnswered?: (count: number) => void
  onComplete?: () => void
}) {
  const [answers, setAnswers] = useState<Answers>({})
  const [done, setDone] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(stage1DoneKey(responseId)) === '1'
  })

  useEffect(() => {
    if (done) onComplete?.()
  }, [done])

  function answer(key: string, value: number | string) {
    const next = { ...answers, [key]: value }
    setAnswers(next)
    onAnswered?.(Object.keys(next).length)
    const save = apiAuthPost('/beta-feedback/stage1', { response_id: responseId, locale, stage1_form_version: STAGE1_FORM_VERSION, ...next })
    const isLast = Object.keys(next).length >= TOTAL_STAGE1_QUESTIONS
    if (isLast) {
      // Await the final upsert so the server has recorded stage1_completed_at
      // before we tell the parent stage 1 is done and it unlocks stage 2.
      save.finally(() => {
        window.localStorage.setItem(stage1DoneKey(responseId), '1')
        setDone(true)
      })
    } else {
      // Non-final answers are fire-and-forget — non-blocking, so a user who
      // never finishes still has whatever partial answers they gave saved.
      save.catch(() => {})
    }
  }

  if (done) {
    return (
      <div className="mt-8 bg-white/10 border border-white/20 rounded-2xl p-5 max-w-sm mx-auto text-center" dir={locale === 'ar' ? 'rtl' : 'ltr'} role="status">
        <p className="text-white/90 text-sm">{stage1Thanks[locale]}</p>
      </div>
    )
  }

  return (
    <div className="mt-8 bg-white/10 border border-white/20 rounded-2xl p-5 max-w-sm mx-auto text-start" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <p className="text-white/80 text-sm mb-4 text-center">{stage1Intro[locale]}</p>
      <div className="space-y-4">
        {stage1Questions.map(q => (
          <div key={q.key}>
            <p className="text-white/70 text-xs mb-2">{q.label[locale]}</p>
            {q.type === 'faces' ? (
              <div className="flex gap-1.5 justify-between">
                {FACE_EMOJIS.map((emoji, i) => {
                  const n = i + 1
                  const active = answers[q.key] === n
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => answer(q.key, n)}
                      className={`flex-1 h-10 rounded-lg text-lg border transition-colors ${
                        active ? 'bg-white/25 border-white/50' : 'bg-white/5 border-white/15 hover:border-white/40'
                      }`}
                    >
                      {emoji}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(q.options || []).map(opt => {
                  const active = answers[q.key] === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => answer(q.key, opt.value)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                        active ? 'bg-white/25 border-white/50 text-white' : 'bg-white/5 border-white/15 text-white/70 hover:border-white/40'
                      }`}
                    >
                      {opt.label[locale]}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
