'use client'

import { useRef, useState } from 'react'
import { apiAuthPost } from '@/lib/api'
import { stage1Intro, stage1Questions, type Locale } from './content'

type Answers = Partial<Record<'s1_clarity' | 's1_feeling' | 's1_understood', number>>

export default function BetaFeedbackStage1({ responseId, locale, onAnswered }: {
  responseId: string
  locale: Locale
  onAnswered?: (count: number) => void
}) {
  const [answers, setAnswers] = useState<Answers>({})
  const submittedOnce = useRef(false)

  function answer(key: keyof Answers, value: number) {
    const next = { ...answers, [key]: value }
    setAnswers(next)
    onAnswered?.(Object.keys(next).length)
    submittedOnce.current = true
    // Fire-and-forget upsert on every tap — non-blocking, so a user who
    // never finishes still has whatever partial answers they gave saved.
    apiAuthPost('/beta-feedback/stage1', { response_id: responseId, locale, ...next }).catch(() => {})
  }

  return (
    <div className="mt-8 bg-white/10 border border-white/20 rounded-2xl p-5 max-w-sm mx-auto text-start" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <p className="text-white/80 text-sm mb-4 text-center">{stage1Intro[locale]}</p>
      <div className="space-y-4">
        {stage1Questions.map(q => (
          <div key={q.key}>
            <p className="text-white/70 text-xs mb-2">{q.label[locale]}</p>
            <div className="flex gap-1.5 justify-between">
              {['😖', '😐', '🙂', '😀', '🤩'].map((emoji, i) => {
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
          </div>
        ))}
      </div>
    </div>
  )
}
