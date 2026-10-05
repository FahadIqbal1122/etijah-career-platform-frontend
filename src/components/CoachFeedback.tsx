'use client'

// The beta feedback forms (pre-result "Stage 1" and in-report "Result stage"), asked one
// question at a time by the coach. Same questions (content.ts), same endpoints, same payload
// shape and same localStorage "done" markers as BetaFeedbackStage1 / BetaFeedbackResultStage,
// so the two UIs stay interchangeable and the admin dashboard data is unaffected.

import { useRef, useState } from 'react'
import { apiAuthPost } from '@/lib/api'
import {
  FACE_EMOJIS, STAGE1_FORM_VERSION, RESULT_STAGE_FORM_VERSION,
  stage1Intro, stage1Thanks, stage1Questions, stage1IntentLabel, stage1IntentOptions,
  resultStageIntro, resultStageQuestions, resultStageNoteLabel,
  type Bi, type Locale, type Option,
} from './beta-feedback/content'

export type FeedbackKind = 'stage1' | 'result'

interface Step { key: string; label: Bi; type: 'faces' | 'options' | 'note'; options?: Option[] }

const STAGE1_STEPS: Step[] = [
  ...stage1Questions.map(q => ({ key: q.key, label: q.label, type: 'faces' as const })),
  { key: 's1_intent', label: stage1IntentLabel, type: 'options', options: stage1IntentOptions },
]
const RESULT_STEPS: Step[] = [
  ...resultStageQuestions.map(q => ({ key: q.key, label: q.label, type: 'options' as const, options: q.options })),
  { key: 'other_text', label: resultStageNoteLabel, type: 'note' },
]

const DONE: Bi = { en: 'Done', ar: 'تم' }
const SKIP: Bi = { en: 'Skip', ar: 'تخطي' }
const RESULT_THANKS: Bi = { en: 'Thank you, that really helps us. 💙', ar: 'شكراً لك، هذا يساعدنا كثيراً. 💙' }

export const feedbackDoneKey = (kind: FeedbackKind, responseId: string) =>
  kind === 'stage1' ? `betaStage1Done:${responseId}` : `betaResultStageDone:${responseId}`

export default function CoachFeedback({ kind, responseId, locale, onDone }: {
  kind: FeedbackKind
  responseId: string
  locale: Locale
  onDone: () => void
}) {
  const steps = kind === 'stage1' ? STAGE1_STEPS : RESULT_STEPS
  const endpoint = kind === 'stage1' ? '/beta-feedback/stage1' : '/beta-feedback/result-stage'
  const version = kind === 'stage1'
    ? { stage1_form_version: STAGE1_FORM_VERSION }
    : { result_stage_form_version: RESULT_STAGE_FORM_VERSION }

  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number | string>>({})
  const [note, setNote] = useState('')
  const [finished, setFinished] = useState(false)
  // Serialises saves so an earlier request always lands before a later one.
  const chain = useRef<Promise<unknown>>(Promise.resolve())

  const step = steps[idx]
  const intro = kind === 'stage1' ? stage1Intro[locale] : resultStageIntro[locale]

  function save(extra: Record<string, number | string>) {
    const p = chain.current.then(() =>
      apiAuthPost(endpoint, { response_id: responseId, locale, ...version, ...extra }).catch(() => {}))
    chain.current = p
    return p
  }

  function complete() {
    try { window.localStorage.setItem(feedbackDoneKey(kind, responseId), '1') } catch {}
    setFinished(true)
    onDone()
  }

  function answer(value: number | string) {
    const next = { ...answers, [step.key]: value }
    setAnswers(next)
    const p = save(next)
    const lastQuestion = kind === 'stage1' ? idx === steps.length - 1 : steps[idx + 1]?.type === 'note'
    if (kind === 'stage1' && lastQuestion) {
      // Stage 1 unlocks the report, so wait until the final answer is stored.
      p.finally(complete)
    } else {
      setIdx(idx + 1)
    }
  }

  function submitNote(skip: boolean) {
    if (!skip && note.trim()) save({ other_text: note.trim() })
    complete()
  }

  if (finished) {
    return <p className="coach-fb-thanks">{(kind === 'stage1' ? stage1Thanks : RESULT_THANKS)[locale]}</p>
  }

  return (
    <div className="coach-fb">
      <p className="coach-fb-intro">{intro}</p>
      <div className="coach-fb-progress" aria-hidden="true">
        {steps.map((_, i) => <span key={i} className={i <= idx ? 'on' : ''} />)}
      </div>
      <p className="coach-fb-q">{step.label[locale]}</p>

      {step.type === 'faces' && (
        <div className="coach-fb-faces">
          {FACE_EMOJIS.map((emoji, i) => (
            <button key={i} type="button" onClick={() => answer(i + 1)} aria-label={`${i + 1}/5`}>{emoji}</button>
          ))}
        </div>
      )}

      {step.type === 'options' && (
        <div className="coach-fb-chips">
          {step.options!.map(o => (
            <button key={o.value} type="button" onClick={() => answer(o.value)}>{o.label[locale]}</button>
          ))}
        </div>
      )}

      {step.type === 'note' && (
        <div>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={1000} />
          <div className="coach-fb-actions">
            <button type="button" className="coach-fb-skip" onClick={() => submitNote(true)}>{SKIP[locale]}</button>
            <button type="button" className="coach-fb-done" onClick={() => submitNote(false)}>{DONE[locale]}</button>
          </div>
        </div>
      )}
    </div>
  )
}
