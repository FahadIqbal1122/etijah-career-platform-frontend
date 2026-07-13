'use client'

// AssessmentForm — Etijahi "UFUQ" gamified assessment.
// One question at a time over the REAL question set (src/data/questions.ts):
// a rising constellation, periodic encouragement "reveal" takeovers, skip
// logic, existing-user check, and backend submit.

import { useEffect, useRef, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { questions, BEHAVIORAL_SCALE, Question } from '@/data/questions'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import { apiPost } from '@/lib/api'
import Logomark from '@/components/brand/Logomark'
import Constellation, { CONSTELLATION } from '@/components/brand/Constellation'
import { frameworkOf, buildReveal, REVEAL_FRAMEWORKS } from '@/data/revealScoring'

// ── skip / auto-fill rules (identical to the original form) ──────────────────
const SKIP_RULES: { condition: (a: Record<string, any>) => boolean; ids: Record<string, any> }[] = [
  { condition: a => a['QO4'] === 'high_school', ids: { QO5: 'not_applicable' } },
  { condition: a => a['QO7'] === 'employee', ids: { Q69: 1, Q71: 'B', Q73: 1 } },
]
function getAutoFills(answers: Record<string, any>): Record<string, any> {
  return SKIP_RULES.filter(r => r.condition(answers)).reduce((acc, r) => ({ ...acc, ...r.ids }), {})
}

// ── "Save & exit" draft (client-side only — no backend, no cross-device sync) ──
const DRAFT_KEY = 'ufuq_assessment_draft'
const DRAFT_VERSION = 1
const DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

type Draft = {
  version: number
  savedAt: number
  totalQuestions: number // sanity check: bail if the question set has changed shape since
  answers: Record<string, any>
  index: number
  revealedFrameworks: string[]
}

function saveDraft(answers: Record<string, any>, index: number, revealedFrameworks: Set<string>) {
  try {
    const draft: Draft = {
      version: DRAFT_VERSION,
      savedAt: Date.now(),
      totalQuestions: questions.length,
      answers,
      index,
      revealedFrameworks: [...revealedFrameworks],
    }
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — saving is best-effort
  }
}

function loadDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const draft = JSON.parse(raw) as Draft
    if (draft.version !== DRAFT_VERSION) return null
    if (draft.totalQuestions !== questions.length) return null
    if (Date.now() - draft.savedAt > DRAFT_MAX_AGE_MS) return null
    if (!draft.answers || Object.keys(draft.answers).length === 0) return null
    return draft
  } catch {
    return null
  }
}

function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY)
  } catch {
    // ignore
  }
}

const CONFIRM_MS = 560
const TOTAL_NODES = CONSTELLATION.nodes.length
const CHROME: Record<string, Record<string, string>> = {
  en: {
    asideEyebrow: 'Discovering you', // ambient label on the desktop split panel
    revealCta: 'Keep going',
    finishHead: 'Your map is taking shape.',
    finishBody: 'You’ve lit the path. This is the start of your Etijahi profile — the full reading is next.',
    finishCta: 'Reveal my result',
    saveExit: 'Save & exit',
    welcomeTitle: 'Welcome back!',
    welcomeBody: 'We found a previous assessment linked to your details. View those results, or retake the assessment?',
    viewPrevious: 'View previous results',
    retake: 'Retake the assessment',
    draftTitle: 'Pick up where you left off?',
    draftBody: 'You have an assessment in progress. Continue from where you saved, or start fresh?',
    draftContinue: 'Continue where I left off',
    draftRestart: 'Start over',
  },
  ar: {
    asideEyebrow: 'نكتشفك', // ambient label on the desktop split panel
    revealCta: 'أكمل',
    finishHead: 'خريطتك تتشكّل.',
    finishBody: 'لقد أضأت الطريق. هذه بداية ملفك في إتجاهي — والقراءة الكاملة تنتظرك.',
    finishCta: 'اكشف نتيجتي',
    saveExit: 'احفظ واخرج',
    welcomeTitle: 'أهلاً بعودتك!',
    welcomeBody: 'وجدنا تقييماً سابقاً مرتبطاً ببياناتك. اعرض تلك النتائج، أو أعد التقييم؟',
    viewPrevious: 'عرض النتائج السابقة',
    retake: 'إعادة التقييم',
    draftTitle: 'أتريد إكمال ما بدأته؟',
    draftBody: 'لديك تقييم لم تكمله بعد. أكمل من حيث توقفت، أم تفضّل البدء من جديد؟',
    draftContinue: 'أكمل من حيث توقفت',
    draftRestart: 'ابدأ من جديد',
  },
}

const MANUAL_TYPES = new Set(['multi_select', 'text_input', 'email_input', 'phone_input'])

export default function AssessmentForm() {
  const locale = useLocale()
  const dir = locale === 'ar' ? 'rtl' : 'ltr'
  const router = useRouter()
  const pathname = usePathname()
  const chrome = CHROME[locale] ?? CHROME.en

  const tForm = useTranslations('form')
  const tSections = useTranslations('sections')
  const tQ = useTranslations('questions')
  const tScale = useTranslations('scale')

  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [index, setIndex] = useState(0)
  // furthest position reached — lets a forward arrow reappear after going back
  // without re-answering, instead of just re-triggering auto-advance.
  const [maxIndex, setMaxIndex] = useState(0)
  const [phase, setPhase] = useState<'question' | 'reveal' | 'finish'>('question')
  const [picked, setPicked] = useState<any>(null)
  const [confirming, setConfirming] = useState(false)
  const [revealMsg, setRevealMsg] = useState<{ head: string; body: string } | null>(null)
  const [rippleKey, setRippleKey] = useState(0)
  const [enterKey, setEnterKey] = useState(0)
  const [checking, setChecking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState('')
  const [showExistingModal, setShowExistingModal] = useState(false)
  const [existingResultId, setExistingResultId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)

  const pendingRef = useRef(0)
  const answersRef = useRef<Record<string, any>>({}) // latest answers, for choice-based reveals
  const revealedRef = useRef<Set<string>>(new Set())  // frameworks already revealed
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const after = (ms: number, fn: () => void) => {
    const id = window.setTimeout(fn, ms)
    timers.current.push(id)
    return id
  }

  // offer to resume a saved draft on mount (once). localStorage isn't available
  // during SSR, so this has to run post-mount rather than as a lazy useState
  // initializer — otherwise the server/client render would mismatch.
  useEffect(() => {
    const found = loadDraft()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of an external (browser-only) store, not a derived/cascading update
    if (found) setDraft(found)
  }, [])

  function resumeDraft() {
    if (!draft) return
    answersRef.current = draft.answers
    revealedRef.current = new Set(draft.revealedFrameworks)
    setAnswers(draft.answers)
    setIndex(draft.index)
    setMaxIndex(draft.index)
    setPhase('question')
    setDraft(null)
  }

  function discardDraft() {
    clearDraft()
    setDraft(null)
  }

  // Effective (non-skipped) question list — recomputed as answers change.
  const autoFills = getAutoFills(answers)
  const skipped = new Set(Object.keys(autoFills))
  const visibleQuestions = questions.filter(q => !skipped.has(q.id))
  const total = visibleQuestions.length
  const q = visibleQuestions[Math.min(index, total - 1)]

  const progress = phase === 'finish' ? 1 : total ? index / total : 0
  const litCount = phase === 'finish'
    ? TOTAL_NODES
    : Math.max(1, Math.min(TOTAL_NODES, Math.round(progress * (TOTAL_NODES - 1)) + 1))

  function isAnswerValid(question: Question): boolean {
    const a = answers[question.id]
    if (a === undefined || a === null || a === '') return false
    if (Array.isArray(a)) return a.length > 0
    if (question.type === 'phone_input') return String(a).replace(/\D/g, '').length >= 7
    if (question.type === 'email_input') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(a))
    if (question.type === 'text_input') return String(a).trim().length >= 2
    return true
  }

  async function checkExistingUser(email: string, phone: string) {
    return apiPost<{ id: string } | null>('/assessment/check-existing', { email, phone })
  }

  // single source of truth for answers — keep the ref in sync so reveals can
  // score the choices made right up to (and including) the current question.
  function setAnswer(id: string, value: any) {
    answersRef.current = { ...answersRef.current, [id]: value }
    setAnswers(answersRef.current)
  }

  function doAdvance() {
    const next = index + 1
    const done = next >= total
    // Fire a reveal when we cross out of a "reveal framework" block (RIASEC,
    // Values, Strengths) — the message reflects the top dimension the user
    // actually leaned toward in that block.
    const curFw = q ? frameworkOf(q.id) : null
    const nextFw = !done ? frameworkOf(visibleQuestions[next]?.id) : null
    const shouldReveal =
      !done &&
      !!curFw &&
      curFw !== nextFw &&
      REVEAL_FRAMEWORKS.includes(curFw) &&
      !revealedRef.current.has(curFw)

    if (shouldReveal && curFw) {
      revealedRef.current.add(curFw)
      setRevealMsg(buildReveal(answersRef.current, curFw, locale))
      setRippleKey(k => k + 1)
      pendingRef.current = next
      setPhase('reveal')
    } else if (done) {
      setPhase('finish')
    } else {
      setIndex(next)
      setMaxIndex(m => Math.max(m, next))
      setPhase('question')
    }
    setEnterKey(k => k + 1)
  }

  // step back to the previous question without losing the answer already
  // given there — lets someone correct a wrong tap instead of restarting.
  function goBack() {
    if (confirming || checking || index === 0) return
    setPicked(null)
    setIndex(i => Math.max(0, i - 1))
    setPhase('question')
    setEnterKey(k => k + 1)
  }

  // re-advance to the furthest point already reached, without re-answering
  // the question currently shown (only available after goBack()).
  function goForward() {
    if (confirming || checking || index >= maxIndex) return
    setPicked(null)
    setIndex(i => Math.min(maxIndex, i + 1))
    setPhase('question')
    setEnterKey(k => k + 1)
  }

  async function handleProceed() {
    // After the last "Your Details" question, check for a returning user.
    if (q.id === 'QD3') {
      setChecking(true)
      try {
        const existing = await checkExistingUser(answers['QD2'], answers['QD3'])
        setChecking(false)
        if (existing) {
          setExistingResultId(existing.id)
          setShowExistingModal(true)
          return
        }
      } catch {
        setChecking(false)
      }
    }
    doAdvance()
  }

  // auto-advance types (scale / forced_choice / single_select) — tap commits
  function pick(value: any) {
    if (confirming || checking) return
    setPicked(value)
    setAnswer(q.id, value)
    setConfirming(true)
    after(CONFIRM_MS, () => {
      setConfirming(false)
      setPicked(null)
      handleProceed()
    })
  }

  // manual types (multi-select / inputs) — explicit Continue
  function proceedManual() {
    if (confirming || checking || !isAnswerValid(q)) return
    setConfirming(true)
    after(CONFIRM_MS, () => {
      setConfirming(false)
      handleProceed()
    })
  }

  // Enter commits text/email/phone inputs (pills/choices already advance on
  // click, and Enter on a focused <button> would just re-fire that click).
  function handleStageKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Enter') return
    if ((e.target as HTMLElement).tagName === 'BUTTON') return
    if (!q || !MANUAL_TYPES.has(q.type)) return
    e.preventDefault()
    proceedManual()
  }

  function toggleMulti(value: string, maxSelect?: number) {
    const current: string[] = answersRef.current[q.id] || []
    let nextArr: string[]
    if (current.includes(value)) nextArr = current.filter(v => v !== value)
    else if (maxSelect && current.length >= maxSelect) nextArr = current
    else nextArr = [...current, value]
    setAnswer(q.id, nextArr)
  }

  function continueFromReveal() {
    const next = pendingRef.current
    if (next >= total) setPhase('finish')
    else {
      setIndex(next)
      setMaxIndex(m => Math.max(m, next))
      setPhase('question')
    }
    setEnterKey(k => k + 1)
  }

  async function handleSubmit() {
    if (submitting) return
    const finalAnswers = { ...answers, ...autoFills }
    setSubmitting(true)
    setError('')
    try {
      const result = await apiPost<{ response_id: string }>('/assessment/submit', {
        full_name: answers['QD1'],
        email: answers['QD2'],
        phone: answers['QD3'],
        country: answers['QO1'],
        nationality: answers['QO2'],
        age_bracket: answers['QO3'],
        current_stage: answers['QO4'],
        education_field: finalAnswers['QO5'],
        sectors_of_interest: answers['QO6'] || [],
        career_structure: answers['QO7'],
        languages: answers['QO8'] || [],
        geographic_openness: answers['QO9'],
        why_here: answers['QO10'],
        answers: finalAnswers,
        completed: true,
      })
      clearDraft()
      setLeaving(true)
      // navigate once the .leaving fade (500ms, see .assess-screen in globals.css)
      // has actually finished, instead of cutting it off mid-transition
      after(520, () => router.push(`/results/${result.response_id}`))
    } catch (err: any) {
      console.error('Submission error:', err)
      setError(err?.message || tForm('error'))
      setSubmitting(false)
    }
  }

  function switchLocale(next: string) {
    router.replace(pathname, { locale: next })
  }

  const arrow = dir === 'rtl' ? '←' : '→'
  const sel = picked !== null ? picked : q ? answers[q.id] : undefined

  return (
    <div className={`assess-screen ${phase === 'reveal' ? 'is-reveal' : ''} ${leaving ? 'leaving' : ''}`} dir={dir} lang={locale}>
      <div className="prog"><div className="prog-fill" style={{ width: `${progress * 100}%` }} /></div>

      <div className="assess-topbar">
        <Logomark size={30} tone="dark" />
        <button className="assess-lang" onClick={() => switchLocale(locale === 'en' ? 'ar' : 'en')}>
          {locale === 'en' ? 'العربية' : 'English'}
        </button>
      </div>

      {/* ── main: ambient panel (left on desktop) + question column (right) ── */}
      <div className="assess-main">
        <aside className="assess-aside">
          <div className="cst-wrap">
            <Constellation litCount={litCount} theme={phase === 'reveal' ? 'teal' : 'dark'} rippleKey={rippleKey} accent="#00C9A7" />
          </div>
          {/* desktop-only progress context beneath the constellation */}
          <div className="assess-aside-context">
            <div className="assess-aside-eyebrow">{chrome.asideEyebrow}</div>
            <div className="assess-aside-count">
              {Math.min(index + 1, total)}<small>/ {total}</small>
            </div>
          </div>
        </aside>

        {/* ── question ──────────────────────────────────────────────────── */}
        <div className="assess-content">
          {phase === 'question' && q && (
            <div className="assess-stage">
              <div
                className={`qbody ${confirming ? 'confirming' : ''}`}
                key={`q-${index}-${enterKey}`}
                onKeyDown={handleStageKeyDown}
              >
            <div className="qsection">{safe(() => tSections(q.section), q.section)}</div>

            {q.type === 'behavioral_scale' && (
              <>
                <div className="qcard"><p className="qtext">{tQ(`${q.id}.text`)}</p></div>
                <div className="pills">
                  {BEHAVIORAL_SCALE.map(opt => (
                    <button key={opt.value} className={`pill ${sel === opt.value ? 'sel' : ''}`} onClick={() => pick(opt.value)}>
                      <span className="pill-dot" />
                      <span className="pill-label">{tScale(String(opt.value))}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {q.type === 'forced_choice' && (
              <div className="choice-wrap">
                <p className="choice-prompt">{tQ(`${q.id}.text`)}</p>
                <div className="choices">
                  {q.options?.map(opt => (
                    <button
                      key={opt.value}
                      className={`choice ${sel === opt.value ? 'sel' : ''} ${sel && sel !== opt.value ? 'dim' : ''}`}
                      onClick={() => pick(opt.value)}
                    >
                      <span className="choice-tag">{opt.value}</span>
                      <span className="choice-text">{tQ(`${q.id}.options.${opt.value}`)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {q.type === 'single_select' && (
              <>
                <div className="qcard"><p className="qtext">{tQ(`${q.id}.text`)}</p></div>
                <div className="pills">
                  {q.options?.map(opt => (
                    <button key={opt.value} className={`pill ${sel === opt.value ? 'sel' : ''}`} onClick={() => pick(opt.value)}>
                      <span className="pill-label">{tQ(`${q.id}.options.${opt.value}`)}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {q.type === 'multi_select' && (
              <>
                <div className="qcard"><p className="qtext">{tQ(`${q.id}.text`)}</p></div>
                {q.maxSelect && <p className="qsection" style={{ marginBottom: 12 }}>{tForm('selectUpTo', { max: q.maxSelect })}</p>}
                <div className="pills">
                  {q.options?.map(opt => {
                    const selected: string[] = answers[q.id] || []
                    const on = selected.includes(opt.value)
                    return (
                      <button key={opt.value} className={`pill ${on ? 'sel' : ''}`} onClick={() => toggleMulti(opt.value, q.maxSelect)}>
                        <span className="pill-dot" />
                        <span className="pill-label">{tQ(`${q.id}.options.${opt.value}`)}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {(q.type === 'text_input' || q.type === 'email_input') && (
              <>
                <div className="qcard"><p className="qtext">{tQ(`${q.id}.text`)}</p></div>
                <input
                  className="qinput"
                  type={q.type === 'email_input' ? 'email' : 'text'}
                  value={answers[q.id] || ''}
                  onChange={e => setAnswer(q.id, e.target.value)}
                  placeholder={tForm('placeholder')}
                  autoFocus
                />
              </>
            )}

            {q.type === 'phone_input' && (
              <>
                <div className="qcard"><p className="qtext">{tQ(`${q.id}.text`)}</p></div>
                <PhoneInput
                  country={'bh'}
                  value={answers[q.id] || ''}
                  onChange={val => setAnswer(q.id, val)}
                  containerClass="!w-full"
                  inputClass="!w-full !h-12 !rounded-2xl !text-base"
                  buttonClass="!rounded-s-2xl"
                />
              </>
            )}

            {/* footer: Continue (manual types) + save & exit */}
            <div style={{ marginTop: 'auto', paddingTop: 18 }}>
              {MANUAL_TYPES.has(q.type) && (
                <button
                  className="cta"
                  style={{ width: '100%' }}
                  disabled={!isAnswerValid(q) || checking}
                  onClick={proceedManual}
                >
                  {/* tForm('next') already carries a bundled arrow (shared with the legacy
                      form's plain-text buttons) — strip it here since we render our own
                      animated .cta-arrow span. */}
                  <span>{checking ? '…' : tForm('next').replace(/[→←]\s*$/, '')}</span>
                  {!checking && <span className="cta-arrow">{arrow}</span>}
                </button>
              )}
              <div className="step-nav">
                <button
                  type="button"
                  className="step-arrow"
                  aria-label={tForm('back')}
                  disabled={index === 0}
                  onClick={goBack}
                >
                  {dir === 'rtl' ? '→' : '←'}
                </button>
                <button
                  className="save-exit"
                  onClick={() => {
                    saveDraft(answersRef.current, index, revealedRef.current)
                    router.push('/')
                  }}
                >
                  {chrome.saveExit}
                </button>
                {index < maxIndex ? (
                  <button
                    type="button"
                    className="step-arrow"
                    aria-label={tForm('forward')}
                    onClick={goForward}
                  >
                    {dir === 'rtl' ? '←' : '→'}
                  </button>
                ) : (
                  <span className="step-arrow-spacer" />
                )}
              </div>
            </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── reveal takeover (full-screen overlay) ───────────────────────── */}
      {phase === 'reveal' && revealMsg && (
        <div className="reveal" key={`rv-${enterKey}`}>
          <div className="reveal-inner">
            <div className="reveal-spark">✦</div>
            <h1 className="reveal-head">{revealMsg.head}</h1>
            <p className="reveal-body">{revealMsg.body}</p>
          </div>
          <button className="cta" onClick={continueFromReveal}>
            <span>{chrome.revealCta}</span>
            <span className="cta-arrow">{arrow}</span>
          </button>
        </div>
      )}

      {/* ── finish (full-screen overlay) ────────────────────────────────── */}
      {phase === 'finish' && (
        <div className="reveal finish" key={`fn-${enterKey}`}>
          <div className="reveal-inner">
            <div className="reveal-spark">✦</div>
            <h1 className="reveal-head">{chrome.finishHead}</h1>
            <p className="reveal-body">{chrome.finishBody}</p>
            {error && <p style={{ color: '#e11d48', fontSize: 14, marginTop: 12 }}>{error}</p>}
          </div>
          <button className="cta" onClick={handleSubmit} disabled={submitting}>
            {submitting && <span className="cta-spinner" aria-hidden="true" />}
            <span>{submitting ? tForm('submitting') : chrome.finishCta}</span>
            {!submitting && <span className="cta-arrow">{arrow}</span>}
          </button>
        </div>
      )}

      {/* ── returning-user modal ────────────────────────────────────────── */}
      {showExistingModal && existingResultId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" dir={dir}>
          <div className="card w-full max-w-sm p-8 space-y-4">
            <h3 className="text-lg font-extrabold text-charcoal">{chrome.welcomeTitle}</h3>
            <p className="text-sm text-charcoal/60">{chrome.welcomeBody}</p>
            <div className="flex flex-col gap-3 pt-2">
              <button className="cta" style={{ width: '100%' }} onClick={() => router.push(`/results/${existingResultId}`)}>
                {chrome.viewPrevious}
              </button>
              <button
                className="w-full py-3 rounded-2xl border border-[var(--line-strong)] text-charcoal/70 font-medium hover:bg-lightblue transition-colors"
                onClick={() => {
                  setShowExistingModal(false)
                  doAdvance()
                }}
              >
                {chrome.retake}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── resume-draft modal ───────────────────────────────────────────── */}
      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" dir={dir}>
          <div className="card w-full max-w-sm p-8 space-y-4">
            <h3 className="text-lg font-extrabold text-charcoal">{chrome.draftTitle}</h3>
            <p className="text-sm text-charcoal/60">{chrome.draftBody}</p>
            <div className="flex flex-col gap-3 pt-2">
              <button className="cta" style={{ width: '100%' }} onClick={resumeDraft}>
                {chrome.draftContinue}
              </button>
              <button
                className="w-full py-3 rounded-2xl border border-[var(--line-strong)] text-charcoal/70 font-medium hover:bg-lightblue transition-colors"
                onClick={discardDraft}
              >
                {chrome.draftRestart}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// tSections may throw for an unmapped key; fall back to the raw section name.
function safe(fn: () => string, fallback: string): string {
  try {
    return fn()
  } catch {
    return fallback
  }
}
