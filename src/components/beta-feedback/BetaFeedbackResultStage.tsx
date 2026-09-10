'use client'

import { useRef, useState } from 'react'
import { apiAuthPost } from '@/lib/api'
import { resultStageIntro, resultStageNoteLabel, resultStageQuestions, type Locale } from './content'
import { PillSelect } from './shared'

type Answers = Partial<Record<'result_accuracy' | 'would_recommend' | 'would_pay', string>>

function resultStageDoneKey(responseId: string) {
  return `betaResultStageDone:${responseId}`
}

const DONE_LABEL: { en: string; ar: string } = { en: 'Done', ar: 'تم' }

export default function BetaFeedbackResultStage({ responseId, locale, initiallyDone }: {
  responseId: string
  locale: Locale
  // Server-truth flag from /beta-feedback/{id}/status — covers a cleared/
  // private-mode browser where the client-side "done" marker below wouldn't
  // otherwise be seen, same reasoning as BetaFeedbackStage1.
  initiallyDone?: boolean
}) {
  const [answers, setAnswers] = useState<Answers>({})
  const [note, setNote] = useState('')
  // Chains saves so an earlier blur's request always reaches the server
  // before a later one, even if the later request would otherwise resolve
  // first — without this, out-of-order responses could let a shorter,
  // earlier note overwrite a longer one the user typed afterward.
  const noteSaveChain = useRef(Promise.resolve())
  const lastSavedNote = useRef('')
  // pillsDone only hides the 3 pill questions (answered, no longer actionable)
  // — it does NOT unmount the card. Previously a single `done` flag did both,
  // so answering the 3rd pill (each PillSelect commits on one click, no
  // confirmation step) instantly unmounted the whole card, taking the note
  // textarea below it with it before a fast user ever got to type in it —
  // defeating the point of offering the note to people who skip Stage 2.
  // Now the card stays open (showing just the note + a Done button) until the
  // user explicitly dismisses it.
  const [pillsDone, setPillsDone] = useState(!!initiallyDone)
  const [dismissed, setDismissed] = useState(() => {
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
      save.finally(() => setPillsDone(true))
    } else {
      // Non-final answers are fire-and-forget — non-blocking, so someone who
      // never finishes still has whatever partial answers they gave saved.
      save.catch(() => {})
    }
  }

  // Optional free-text note, saved to the same `other_text` column Stage 2's
  // "Anything else you'd like to tell us?" field reads — so someone who skips
  // Stage 2 entirely can still leave a note, and Stage 2 pre-fills with it
  // instead of asking twice. Fire-and-forget on blur, same as the pill answers,
  // but chained through noteSaveChain (see above) so requests land in order.
  function saveNote() {
    const text = note
    if (!text.trim() || text === lastSavedNote.current) return
    lastSavedNote.current = text
    noteSaveChain.current = noteSaveChain.current.then(async () => {
      await apiAuthPost('/beta-feedback/result-stage', { response_id: responseId, locale, other_text: text }).catch(() => {})
    })
  }

  function finish() {
    saveNote()
    window.localStorage.setItem(resultStageDoneKey(responseId), '1')
    setDismissed(true)
  }

  if (dismissed) return null

  return (
    <div className="card p-5" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <p className="text-sm font-bold text-charcoal mb-3">{resultStageIntro[locale]}</p>
      {!pillsDone && (
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
      )}
      <div className={pillsDone ? '' : 'mt-4'}>
        <p className="text-sm font-medium text-slate-700 mb-1.5">
          {resultStageNoteLabel[locale]}
        </p>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          onBlur={saveNote}
          rows={2}
          className="w-full text-sm text-slate-800 bg-white border border-slate-200 rounded-lg py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:border-accent focus:ring-teal/15 transition-colors resize-none leading-relaxed"
        />
        {pillsDone && (
          <button
            type="button"
            onClick={finish}
            className="mt-3 text-sm font-semibold text-primary hover:underline"
          >
            {DONE_LABEL[locale]}
          </button>
        )}
      </div>
    </div>
  )
}
