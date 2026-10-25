'use client'

// AssessmentForm — Etijahi "UFUQ" gamified assessment.
// One question at a time over the REAL question set (src/data/questions.ts):
// a rising constellation, periodic encouragement "reveal" takeovers, skip
// logic, existing-user check, and backend submit.

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { questions, BEHAVIORAL_SCALE, Question } from '@/data/questions'
import { SPECIALISMS } from '@/data/specialisms'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import { apiAuthGet, apiAuthPost, apiGet, apiPost } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import Logomark from '@/components/brand/Logomark'
// import Constellation, { CHAPTER_CONSTELLATION } from '@/components/brand/Constellation'   // replaced by ChapterStars
import ChapterStars from '@/components/brand/ChapterStars'
import BreakPanel from '@/components/BreakPanel'
// import CoachBubble from '@/components/CoachBubble'   // replaced by CoachWidget (two-way chat)
import CoachWidget from '@/components/CoachWidget'
import { useCoachSwitches } from '@/lib/useCoachEnabled'
import { COACH_BREAK, COACH_MOTIVATION, COACH_REVEAL, type Bi } from '@/data/coachMessages'

// module-level so the random call stays out of render (only used in an effect)
function pickCoachReveal(): Bi {
  return COACH_REVEAL[Math.floor(Math.random() * COACH_REVEAL.length)]
}
function pickCoachPool(): { pool: Bi[]; isBreak: boolean } {
  const isBreak = Math.random() < 0.35
  return { pool: isBreak ? COACH_BREAK : COACH_MOTIVATION, isBreak }
}
import BugReportModal from '@/components/BugReportModal'
import FieldOfStudyInfo from '@/components/FieldOfStudyInfo'
import LanguageSelect from '@/components/LanguageSelect'
import FieldOfStudySelect from '@/components/FieldOfStudySelect'
import IconTiles from '@/components/IconTiles'
import AgeWheel from '@/components/AgeWheel'
import { buildReveal } from '@/data/revealScoring'
import { CHAPTERS, CHAPTER_COUNT, chapterIndexOf } from '@/data/chapters'
import { initTelemetry, pushTelemetry, getTelemetrySessionId, rotateTelemetrySession, flush as flushTelemetry } from '@/lib/telemetry'
import { track, trackOnce } from '@/lib/analytics'

// ── skip / auto-fill rules (identical to the original form) ──────────────────
// The real (non-"not applicable") study fields picked in QO5, in pick order.
const realFields = (a: Record<string, any>): string[] =>
  (Array.isArray(a['QO5']) ? a['QO5'] : []).filter((f: string) => f && f !== 'not_applicable' && f !== 'other')
const PRO_STAGES = ['working_exploring', 'career_changer', 'returning', 'between_roles', 'other']
const SKIP_RULES: { condition: (a: Record<string, any>) => boolean; ids: Record<string, any> }[] = [
  // The old two-step field-of-study questions (QO5, then QO5D1/QO5D2) are replaced by the single QOFS list; they
  // stay defined in questions.ts but are never shown. (Must come before the high-school rule, which sets QO5.)
  { condition: () => true, ids: { QO5: [], QO5D1: '', QO5D2: '' } },
  { condition: a => a['QO4'] === 'high_school', ids: { QO5: ['not_applicable'], QOFS: [], QO5A: '', QO5B: '', QO5C: '' } },
  { condition: a => !['still_deciding', 'not_chosen'].includes(a['QO5A']), ids: { QO5B: '' } },
  // Year of study is only asked of university students; the high-school goal question only of high-school users.
  { condition: a => a['QO4'] !== 'university', ids: { QOYR: '' } },
  { condition: a => a['QO4'] !== 'high_school', ids: { QO5C_HS: '' } },
  // Specific-area follow-ups: one per real field picked in QO5 (max 2).
  { condition: a => realFields(a).length < 1, ids: { QO5D1: '' } },
  { condition: a => realFields(a).length < 2, ids: { QO5D2: '' } },
  // Goal question: QO5C for students/graduates, QO5C_PRO (same values, work wording) for everyone
  // who is working or between roles. Exactly one of the two is shown once QO4 is answered.
  { condition: a => PRO_STAGES.includes(a['QO4']), ids: { QO5C: '' } },
  { condition: a => !!a['QO4'] && !PRO_STAGES.includes(a['QO4']), ids: { QO5C_PRO: '' } },
  // Resilience chapter. Q58 never fed a score, so nobody is asked it. School students and the first three
  // years of university skip the whole block (long-term focus Q53–Q57 and the four job scenarios Q59/60/61/64):
  // the dimension is then simply absent, and the report leaves resilience out. Nothing is filled in for it.
  { condition: () => true, ids: { Q58: '' } },
  {
    condition: a => a['QO4'] === 'high_school' || (a['QO4'] === 'university' && ['year_1', 'year_2', 'year_3'].includes(a['QOYR'])),
    ids: { Q53: '', Q54: '', Q55: '', Q56: '', Q57: '', Q59: '', Q60: '', Q61: '', Q64: '' },
  },
  { condition: a => a['QO7'] === 'employee', ids: { Q69: 1, Q71: 'B', Q73: 1 } },
  // Someone who wants to stay local is not asked which country to work in: it is where they live now.
  { condition: a => a['QO9'] === 'no', ids: { QOTC: 'same_as_current' } },
  // "What brought you here today" overlapped the goal question, so it is no longer asked (kept in questions.ts;
  // why_here is filled from the goal answer at submit).
  { condition: () => true, ids: { QO10: '' } },
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
    window.localStorage.removeItem(DRAFT_TOKEN_KEY)
  } catch {
    // ignore
  }
}

// ── server-side copy of the draft (powers the reminder email's "continue" link) ──
// The browser keeps working off localStorage exactly as before; this additionally mirrors the draft to the
// backend under an unguessable resume token, so the link in the reminder email restores it on any device.
const DRAFT_TOKEN_KEY = 'ufuq_assessment_draft_token'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
// Nothing is sent to the server until the "Your Details" block is done (that is also when the returning-user
// check has run), so people who leave on the first screens are never recorded.
const DETAILS_DONE_INDEX = questions.findIndex(x => x.id === 'QD3')

function getDraftToken(): string | null {
  try { return window.localStorage.getItem(DRAFT_TOKEN_KEY) } catch { return null }
}

function setDraftToken(token: string) {
  try { window.localStorage.setItem(DRAFT_TOKEN_KEY, token) } catch { /* best-effort */ }
}

function saveDraftToServer(answers: Record<string, unknown>, index: number, revealed: Set<string>, locale: string) {
  const email = String(answers['QD2'] || '').trim()
  if (index <= DETAILS_DONE_INDEX || !EMAIL_RE.test(email)) return
  apiPost<{ resume_token: string }>('/assessment/draft', {
    resume_token: getDraftToken(),
    email,
    full_name: answers['QD1'] || null,
    locale,
    answers,
    current_index: index,
    revealed_frameworks: [...revealed],
    total_questions: questions.length,
  })
    .then(r => { if (r?.resume_token) setDraftToken(r.resume_token) })
    .catch(() => { /* best-effort: the local draft still works */ })
}

const CONFIRM_MS = 560
const CHROME: Record<string, Record<string, string>> = {
  en: {
    asideEyebrow: 'Discovering you', // ambient label on the desktop split panel
    unlockNote: 'At the end you’ll see a first look at your profile, and you can unlock your full report when you’re ready.',
    revealCta: 'Keep going',
    finishHead: 'Your map is taking shape.',
    finishBody: 'You’ve lit the path. This is the start of your Etijahi profile — the full reading is next.',
    finishCta: 'Reveal my result',
    or: 'or',
    ageHint: 'Scroll to your age, or tap a number',
    ageType: 'Type it instead',
    ageWheelBack: 'Use the wheel',
    chapterWord: 'Chapter',
    chapterOf: 'of',
    chapterDone: 'complete',
    chapterNext: 'Next',
    journeyTitle: 'Your journey',
    journeySub: 'Each star is a chapter. Finish it and it lights up.',
    youLabel: 'You',
    towardStar: 'On the way to star',
    starLit: 'star',
    starLitDone: 'is lit',
    saveExit: 'Save & exit',
    welcomeTitle: 'Welcome back!',
    welcomeBody: 'We found a previous assessment linked to your details. View those results, or retake the assessment?',
    welcomeBodyBlocked: 'Your plan includes one full report, and it is ready. Open your results to view it.',
    retakeNotIncluded: 'Your plan includes one full report, which you have already used. Open your results from your dashboard.',
    viewPrevious: 'View previous results',
    retake: 'Retake the assessment',
    draftTitle: 'Pick up where you left off?',
    draftBody: 'You have an assessment in progress. Continue from where you saved, or start fresh?',
    draftContinue: 'Continue where I left off',
    draftRestart: 'Start over',
  },
  ar: {
    asideEyebrow: 'نكتشفك', // ambient label on the desktop split panel
    unlockNote: 'في النهاية ستحصل على لمحة أولى عن ملفك، ويمكنك فتح تقريرك الكامل متى كنت جاهزاً.',
    revealCta: 'أكمل',
    finishHead: 'خريطتك تتشكّل.',
    finishBody: 'لقد أضأت الطريق. هذه بداية ملفك في إتجاهي — والقراءة الكاملة تنتظرك.',
    finishCta: 'اكشف نتيجتي',
    or: 'أو',
    ageHint: 'مرّر لاختيار عمرك، أو اضغط على الرقم',
    ageType: 'اكتبه بدلاً من ذلك',
    ageWheelBack: 'استخدم العجلة',
    chapterWord: 'الفصل',
    chapterOf: 'من',
    chapterDone: 'اكتمل',
    chapterNext: 'التالي',
    journeyTitle: 'رحلتك',
    journeySub: 'كل نجمة فصل. أكمله فتضيء.',
    youLabel: 'أنت',
    towardStar: 'في طريقك إلى النجمة',
    starLit: 'أضاءت النجمة',
    starLitDone: '',
    saveExit: 'احفظ واخرج',
    welcomeTitle: 'أهلاً بعودتك!',
    welcomeBody: 'وجدنا تقييماً سابقاً مرتبطاً ببياناتك. اعرض تلك النتائج، أو أعد التقييم؟',
    welcomeBodyBlocked: 'تتضمن خطتك تقريراً كاملاً واحداً، وهو جاهز. افتح نتائجك لعرضه.',
    retakeNotIncluded: 'تتضمن خطتك تقريراً كاملاً واحداً وقد استخدمته. افتح نتائجك من لوحة التحكم.',
    viewPrevious: 'عرض النتائج السابقة',
    retake: 'إعادة التقييم',
    draftTitle: 'أتريد إكمال ما بدأته؟',
    draftBody: 'لديك تقييم لم تكمله بعد. أكمل من حيث توقفت، أم تفضّل البدء من جديد؟',
    draftContinue: 'أكمل من حيث توقفت',
    draftRestart: 'ابدأ من جديد',
  },
}

// Rotating pure-encouragement copy — no raw question counts or time
// estimates, which tended to alarm test users ("80 questions left") or read
// as a broken promise when the pace estimate was off. Milestones (halfway,
// last question) stay since they're reassuring rather than daunting.
// Interleaved with light career/psychology trivia and clean jokes so the
// same handful of "keep going" lines don't repeat the whole way through —
// ordered so a plain encouragement line and a fun one alternate.
const ENCOURAGEMENT: Record<'en' | 'ar', string[]> = {
  en: [
    'You’re doing great',
    'Fun fact: most people change careers 5–7 times in their life',
    'Keep going',
    'Did you know? Curiosity is one of the strongest predictors of career happiness',
    'Nice pace',
    'Why did the résumé break up with the cover letter? It needed some space',
    'Making great progress',
    'Trivia: the personality model behind this assessment has been used since the 1950s',
    'You’ve got this',
    'What did one job interview say to the other? You’re a-peeling',
  ],
  ar: [
    'أنت تبلي بلاءً حسناً',
    'معلومة طريفة: كثيرون يغيّرون مسارهم المهني من ٥ إلى ٧ مرات خلال حياتهم',
    'استمر',
    'هل تعلم؟ الفضول من أقوى العوامل المرتبطة بالرضا الوظيفي',
    'وتيرة رائعة',
    'طرفة: لماذا رفضت السيرة الذاتية الذهاب للمقابلة؟ لأنها لم تكن مستعدة للتقديم على نفسها',
    'تقدّم ممتاز',
    'معلومة: النموذج النفسي الذي يعتمد عليه هذا التقييم مستخدم منذ الخمسينيات',
    'أنت قادر على ذلك',
    'طرفة: ما سر نجاح الباحث عن عمل الخجول؟ يتحدث بثقة… في سيرته الذاتية فقط',
  ],
}

function buildProgressMessage(index: number, total: number, locale: string): string {
  if (!total) return ''
  // clamp to >=1 rather than >=0 — if skip-logic ever shrinks `total` below
  // `index` mid-session, fall back to the "last question" copy instead of a
  // nonsensical "0 questions left"
  const remaining = Math.max(1, total - index)
  const pct = index / total
  const isAr = locale === 'ar'

  // Shown once, on the very first question only — the constellation otherwise
  // gives no indication it's a progress indicator at all (people register it
  // as ambient decoration until they happen to notice a star has lit). One
  // plain-language line the moment someone has the most attention to spare,
  // rather than a persistent number/percentage — those were tried before and
  // read as daunting (see the ENCOURAGEMENT comment above).
  if (index === 0) return isAr ? '✦ تضيء نجمة مع إكمال كل فصل' : '✦ A star lights up as you finish each chapter'

  if (remaining === 1) return isAr ? 'سؤال أخير!' : 'Last question!'
  if (pct >= 0.48 && pct < 0.52) return isAr ? 'منتصف الطريق! استمر' : 'Halfway there — keep going'
  if (remaining <= 5) return isAr ? 'أنت على وشك الانتهاء' : 'So close — almost done'

  const pool = ENCOURAGEMENT[isAr ? 'ar' : 'en']
  return pool[index % pool.length]
}

const MANUAL_TYPES = new Set(['multi_select', 'text_input', 'number_input', 'email_input', 'phone_input'])

export default function AssessmentForm() {
  const locale = useLocale()
  const dir = locale === 'ar' ? 'rtl' : 'ltr'
  const router = useRouter()
  const pathname = usePathname()
  const chrome = CHROME[locale] ?? CHROME.en

  const tForm = useTranslations('form')
  // const tSections = useTranslations('sections')   // section names replaced by chapter titles (src/data/chapters.ts)
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
  const [revealMsg, setRevealMsg] = useState<{ head: string; body: string; chapter: number } | null>(null)
  const [rippleKey, setRippleKey] = useState(0)
  const [maxSelectHit, setMaxSelectHit] = useState(false)
  const [enterKey, setEnterKey] = useState(0)
  const [checking, setChecking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState('')
  const [showExistingModal, setShowExistingModal] = useState(false)
  const [existingResultId, setExistingResultId] = useState<string | null>(null)
  // A paid account that has used its one full report: the returning-user modal offers no retake.
  const [retakeBlocked, setRetakeBlocked] = useState(false)
  const [showClaimedModal, setShowClaimedModal] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [ageTyping, setAgeTyping] = useState(false) // age question: typed box instead of the wheel

  // Admin switch (Coach tab): off = no coach in the assessment, the break-panel button is back as it was before her.
  // The riddle / games button is a separate switch (Coach tab): off = no game button anywhere in the assessment.
  const { coach: coachEnabled, games: gamesEnabled } = useCoachSwitches()

  // One-way coach bubble: a random break/motivation nudge every 4–7 questions
  // (first around Q4–6), never during reveal/finish, each message at most once.
  const [coachMsg, setCoachMsg] = useState<Bi | null>(null)
  const coachNextAt = useRef(3 + Math.floor(Math.random() * 3))
  const coachUsed = useRef<Set<string>>(new Set())
  // Sarah moves around so she is never parked in one place: on desktop she glides between a few spots (under the
  // text, in the sky above the stars, over the top of the question card), on phones she hops between the two
  // bottom corners. She changes spot every time she has a tip, and comes to the middle of the screen on the green
  // reveal screen with an encouraging line (revealTip).
  const [coachSide, setCoachSide] = useState<'end' | 'start'>('end')
  const [coachSpot, setCoachSpot] = useState(0)
  const [revealTip, setRevealTip] = useState<Bi | null>(null)
  const [coachTipGame, setCoachTipGame] = useState(false)
  // Desktop spots she can stand on (elements she glides to): under the text, in the sky above the stars, beside the text.
  const [coachSlot, setCoachSlot] = useState<HTMLElement | null>(null)
  const [coachQuestionSlot, setCoachQuestionSlot] = useState<HTMLElement | null>(null)
  const dismissCoach = useCallback(() => { setCoachMsg(null); setRevealTip(null); setCoachSpot(0) }, [])
  useEffect(() => {
    if (!coachEnabled || phase !== 'question' || index < coachNextAt.current) return
    const { pool: basePool, isBreak } = pickCoachPool()
    const pool = basePool.filter(m => !coachUsed.current.has(m.en))
    coachNextAt.current = index + 4 + Math.floor(Math.random() * 4)
    if (!pool.length) return
    const pick = pool[Math.floor(Math.random() * pool.length)]
    coachUsed.current.add(pick.en)
    setCoachSide(s => (s === 'end' ? 'start' : 'end'))
    setCoachSpot(1)   // she steps over to the question while she comments on it
    setCoachTipGame(isBreak)   // break tips also offer the riddle / games
    setCoachMsg(pick)
  }, [index, phase])

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
  // A ?resume=<token> link from the reminder email wins over the browser-local draft, so it works on any
  // device; if the token is stale or the question set has changed, fall back to the local draft. The token
  // is stripped from the address bar either way.
  useEffect(() => {
    let cancelled = false
    const local = loadDraft()
    const token = new URLSearchParams(window.location.search).get('resume')
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of an external (browser-only) store, not a derived/cascading update
      if (local) setDraft(local)
      return
    }
    apiGet<{ answers: Record<string, unknown>; current_index: number; revealed_frameworks: string[]; total_questions: number }>(
      `/assessment/draft/${encodeURIComponent(token)}`,
    )
      .then(s => {
        if (cancelled) return
        if (s.total_questions !== questions.length || !s.answers || Object.keys(s.answers).length === 0) throw new Error('stale')
        setDraftToken(token) // later autosaves update this same server row
        setDraft({
          version: DRAFT_VERSION, savedAt: Date.now(), totalQuestions: s.total_questions,
          answers: s.answers, index: s.current_index, revealedFrameworks: s.revealed_frameworks || [],
        })
      })
      .catch(() => { if (!cancelled && local) setDraft(local) })
      .finally(() => { try { window.history.replaceState(null, '', window.location.pathname) } catch { /* ignore */ } })
    return () => { cancelled = true }
  }, [])

  // A paid account that has used its one full report is told now, before any question, and pointed to that report.
  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || cancelled) return
      return apiAuthGet<{ blocked: boolean; latest_response_id: string | null }>('/assessment/allowance').then(a => {
        if (cancelled || !a.blocked || !a.latest_response_id) return
        setExistingResultId(a.latest_response_id)
        setRetakeBlocked(true)
        setShowExistingModal(true)
      })
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Logged-in users shouldn't have to retype their name/email — pre-fill QD1/QD2
  // from the Supabase session, without clobbering anything already answered
  // (e.g. a resumed draft) and leaving the fields editable either way.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user
      if (!user) return
      if (!answersRef.current.QD1 && user.user_metadata?.full_name) setAnswer('QD1', user.user_metadata.full_name)
      if (!answersRef.current.QD2 && user.email) setAnswer('QD2', user.email)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setAnswer is a stable helper closing over refs, safe to omit
  }, [])

  // Continuous autosave (debounced) — the manual "Save & exit" button was the
  // only thing persisting a draft, so a real browser back-button/gesture (not
  // the in-app arrow) or an accidental tab close mid-assessment lost every
  // answer with no recovery. This keeps a draft current without the user
  // having to remember to save.
  useEffect(() => {
    if (Object.keys(answers).length === 0) return
    const id = window.setTimeout(() => {
      saveDraft(answersRef.current, index, revealedRef.current)
      saveDraftToServer(answersRef.current, index, revealedRef.current, locale)
    }, 1000)
    return () => clearTimeout(id)
  }, [answers, index, locale])

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
    // "Start fresh": also forget the server copy so no reminder is sent for it
    const token = getDraftToken()
    if (token) apiPost('/assessment/draft/discard', { resume_token: token }).catch(() => { /* best-effort */ })
    clearDraft()
    setDraft(null)
    rotateTelemetrySession() // starting over — don't conflate with the abandoned attempt
  }

  // Behavioral telemetry (device type, break-panel plays, per-question
  // pacing) for the admin "Behavior" dashboard — see src/lib/telemetry.ts.
  // Runs once on mount; locale is re-synced separately below since the
  // in-page language toggle can change it without remounting.
  useEffect(() => {
    pushTelemetry({ event_type: 'session_start', payload: { user_agent: navigator.userAgent } })
    // best-effort flush when the tab is hidden/closed — an in-flight fetch
    // would otherwise get cancelled before an ordinary POST completes.
    const onHide = () => { if (document.visibilityState === 'hidden') flushTelemetry(true) }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onHide)
    }
  }, [])

  useEffect(() => { initTelemetry(locale) }, [locale])

  // Effective (non-skipped) question list — recomputed as answers change.
  const autoFills = getAutoFills(answers)
  const skipped = new Set(Object.keys(autoFills))
  const visibleQuestions = questions.filter(q => !skipped.has(q.id))
  const total = visibleQuestions.length
  const rawQ = visibleQuestions[Math.min(index, total - 1)]
  // Dynamic questions (QO5D1/2) get their options from the field picked in QO5. Memoised so `q` keeps a
  // stable identity between renders (effects below depend on it).
  const dynField = rawQ?.dynamic ? realFields(answers)[rawQ.dynamic.index] : undefined
  const q = useMemo<Question>(() => {
    if (!rawQ?.dynamic) return rawQ
    return { ...rawQ, options: (SPECIALISMS[dynField ?? ''] ?? []).map(k => ({ value: `${dynField}_${k}`, label: k })) }
  }, [rawQ, dynField])
  // High-school students see plainer school-level wording (messages: `<id>_HS`) where one exists. Only the
  // translation lookup changes; answers are still stored and scored under q.id.
  const hsId = q && answers['QO4'] === 'high_school' && tQ.has(`${q.id}_HS.text`) ? `${q.id}_HS` : null
  const mid = hsId ?? q?.msgId ?? q?.id
  const qTextStr = q ? tQ(`${mid}.text`, dynField ? { field: tQ(`QO5.options.${dynField}`) } : undefined) : ''

  // Tag Manager: the page was seen (fires on every load of the assessment).
  // assessment_start now fires from doAdvance() when question 1 is actually answered.
  useEffect(() => {
    track('assessment_view', { lang: locale })
  }, [])

  // Old behaviour — fired on render of question 1, so it counted page visits as starts:
  // useEffect(() => {
  //   if (phase !== 'question' || !q) return
  //   trackOnce(`assessment_start:${getTelemetrySessionId()}`, 'assessment_start', { lang: locale })
  // }, [phase, q])

  // Per-question pacing — the cleanup fires exactly when `q.id`/`phase`
  // changes (next question, back, a reveal takeover, finish) or on unmount
  // (closing the tab mid-question), so this needs no manual ref bookkeeping.
  useEffect(() => {
    if (phase !== 'question' || !q) return
    const startedAt = Date.now()
    const questionId = q.id
    return () => {
      pushTelemetry({ event_type: 'question_view', question_id: questionId, duration_ms: Date.now() - startedAt })
    }
  }, [phase, q])

  // clamped to 1 — if skip-logic shrinks `total` below `index` mid-session
  // (editing an earlier answer while ahead of it), the raw ratio can exceed 1
  // Chapters: one star each, earned when the chapter is finished (the green screen lights it).
  const chapterOfVisible = visibleQuestions.map(v => chapterIndexOf(v.id, v.section))
  const curChapter = phase === 'finish'
    ? CHAPTER_COUNT - 1
    : phase === 'reveal' && revealMsg ? revealMsg.chapter : q ? chapterIndexOf(q.id, q.section) : 0
  // Where the person is inside the current chapter; only used to place the travelling light, never shown as numbers.
  const chapterTotal = chapterOfVisible.filter(c => c === curChapter).length
  const chapterPos = chapterOfVisible.slice(0, index + 1).filter(c => c === curChapter).length
  // Stars already earned stay lit when stepping back into an earlier chapter: use the furthest chapter reached.
  const furthestChapter = chapterOfVisible[Math.min(maxIndex, total - 1)] ?? curChapter
  const litCount = phase === 'finish' ? CHAPTER_COUNT : phase === 'reveal' ? curChapter + 1 : Math.max(curChapter, furthestChapter)
  const chapterTitle = (c: number) => CHAPTERS[c]?.title[locale === 'ar' ? 'ar' : 'en'] ?? ''
  const chapterLabel = (c: number) => `${chrome.chapterWord} ${c + 1} ${chrome.chapterOf} ${CHAPTER_COUNT}`
  // "Chapter 2 of 5 complete" / «اكتمل الفصل 2 من 5»
  const chapterDoneLabel = (c: number) => locale === 'ar' ? `${chrome.chapterDone} ${chapterLabel(c)}` : `${chapterLabel(c)} ${chrome.chapterDone}`
  // Arabic uses «من» between the numbers so the digits don't flip order inside the right-to-left line.
  // const chapterCount = locale === 'ar' ? `${chapterPos} من ${chapterTotal}` : `${chapterPos} / ${chapterTotal}`   // question counts are not shown any more
  // Overall progress as a percentage of the assessment (no question counts).
  const percentDone = total ? Math.max(0, Math.min(100, Math.round((index / total) * 100))) : 0
  const percentLabel = locale === 'ar' ? `اكتمل ${percentDone}%` : `${percentDone}% complete`
  // The travelling light: finished chapters plus how far through the current one (never moves backwards past a lit star).
  const journeyProgress = Math.max(
    litCount,
    phase === 'finish' ? CHAPTER_COUNT : phase === 'reveal' ? curChapter + 1 : curChapter + Math.max(0, chapterPos - 1) / Math.max(1, chapterTotal),
  )
  const starTarget = Math.min(litCount, CHAPTER_COUNT - 1)   // 0-based star being travelled to
  const starShort = (c: number) => CHAPTERS[c]?.short[locale === 'ar' ? 'ar' : 'en'] ?? ''
  // "Chapter 2 of 5 complete · star 2 is lit" / «اكتمل الفصل 2 من 5 · أضاءت النجمة 2»
  const starLitLabel = (c: number) => `${chrome.starLit} ${c + 1}${chrome.starLitDone ? ` ${chrome.starLitDone}` : ''}`
  // const journeyCaption = `${chrome.towardStar} ${starTarget + 1} ${chrome.chapterOf} ${CHAPTER_COUNT} · ${percentLabel}`   // shortened to the percentage only
  const journeyCaption = percentLabel

  const progressMsg = buildProgressMessage(index, total, locale)

  // "Other" needs its free-text field filled before the answer counts —
  // applies whether "other" is a lone value (single_select) or one entry in
  // a multi_select array.
  function otherTextFilled(questionId: string): boolean {
    return String(answers[`${questionId}_other`] || '').trim().length > 0
  }

  function isAnswerValid(question: Question): boolean {
    const a = answers[question.id]
    // Optional questions can be skipped (empty); if something is typed it still has to be a real answer.
    if (question.optional) {
      const t = String(a ?? '').trim()
      return t === '' || t.length >= 2
    }
    if (a === undefined || a === null || a === '') return false
    if (Array.isArray(a)) {
      if (a.length === 0) return false
      if (a.includes('other') && !otherTextFilled(question.id)) return false
      return true
    }
    if (question.type === 'phone_input') return String(a).replace(/\D/g, '').length >= 7
    if (question.type === 'email_input') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(a))
    if (question.type === 'text_input') return String(a).trim().length >= 2
    if (question.type === 'number_input') {
      const n = Number(a)
      return Number.isInteger(n) && n >= 10 && n <= 100
    }
    if (a === 'other' && !otherTextFilled(question.id)) return false
    return true
  }

  async function checkExistingUser(email: string, phone: string) {
    // Authenticated so the backend can tell "someone else's claimed account"
    // apart from "the logged-in user's own prior response" — see main.py's
    // check_existing.
    return apiAuthPost<{ id: string | null; claimed?: boolean; retake_blocked?: boolean } | null>('/assessment/check-existing', { email, phone })
  }

  // single source of truth for answers — keep the ref in sync so reveals can
  // score the choices made right up to (and including) the current question.
  function setAnswer(id: string, value: any) {
    answersRef.current = { ...answersRef.current, [id]: value }
    setAnswers(answersRef.current)
  }

  function doAdvance() {
    // Tag Manager funnel events. Keyed by the telemetry session id so Back/forward doesn't double-fire.
    const sid = getTelemetrySessionId()
    // Real start: question 1 (name) answered and Next clicked.
    if (q?.id === 'QD1') trackOnce(`assessment_start:${sid}`, 'assessment_start', { lang: locale })
    // Name + email + phone step submitted (QD3 is the last details question).
    if (q?.id === 'QD3') trackOnce(`assessment_details_submitted:${sid}`, 'assessment_details_submitted')
    const next = index + 1
    const done = next >= total
    // Every advance pulses the constellation's current star, not just the
    // handful of "reveal" moments below — most answers otherwise only fade
    // a node's color, a change easy to miss entirely since attention is on
    // the question card, not the aside. A visible pulse each time ties the
    // graphic's motion directly to the action that just happened.
    setRippleKey(k => k + 1)
    // Fire the green "chapter complete" screen when we cross out of a chapter. Chapters with a scoring framework
    // (interests, values, strengths) reflect what the user leaned toward; the others use fixed copy.
    const curCh = q ? chapterIndexOf(q.id, q.section) : 0
    const nextCh = !done ? chapterIndexOf(visibleQuestions[next].id, visibleQuestions[next].section) : curCh
    const chKey = `ch${curCh}`
    const shouldReveal = !done && nextCh !== curCh && !revealedRef.current.has(chKey)

    if (shouldReveal) {
      revealedRef.current.add(chKey)
      const ch = CHAPTERS[curCh]
      const lang = locale === 'ar' ? 'ar' : 'en'
      const msg = ch.revealFramework
        ? buildReveal(answersRef.current, ch.revealFramework, locale)
        : ch.done?.[lang] ?? buildReveal(answersRef.current, 'riasec', locale)
      setRevealMsg({ ...msg, chapter: curCh })
      setRevealTip(pickCoachReveal())
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
  // the question currently shown (only available after goBack()). Blocked on
  // an unanswered current question — if editing an earlier answer changed
  // the skip-logic list, a position that used to be answered can now hold a
  // different, newly-required question that the maxIndex bookmark knows
  // nothing about; without this check, forward would step past it unanswered.
  function goForward() {
    if (confirming || checking || index >= maxIndex || !isAnswerValid(q)) return
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
        if (existing?.claimed) {
          setShowClaimedModal(true)
          return
        }
        if (existing?.id) {
          setExistingResultId(existing.id)
          setRetakeBlocked(!!existing.retake_blocked)
          setShowExistingModal(true)
          return
        }
      } catch {
        setChecking(false)
      }
    }
    doAdvance()
  }

  // auto-advance types (scale / forced_choice / single_select) — tap commits.
  // Picking "other" is the one exception: it needs a free-text field filled
  // in first, so it waits for the explicit Continue button instead.
  function pick(value: any) {
    if (confirming || checking) return
    setPicked(value)
    setAnswer(q.id, value)
    if (value === 'other') return
    setConfirming(true)
    after(CONFIRM_MS, () => {
      setConfirming(false)
      setPicked(null)
      handleProceed()
    })
  }

  // manual types (multi-select / inputs / "other") — explicit Continue
  function proceedManual() {
    if (confirming || checking || !isAnswerValid(q)) return
    setConfirming(true)
    after(CONFIRM_MS, () => {
      setConfirming(false)
      setPicked(null)
      handleProceed()
    })
  }

  // Enter commits text/email/phone inputs (pills/choices already advance on
  // click, and Enter on a focused <button> would just re-fire that click).
  function handleStageKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Enter') return
    if ((e.target as HTMLElement).tagName === 'BUTTON') return
    if (!q || !(MANUAL_TYPES.has(q.type) || sel === 'other')) return
    e.preventDefault()
    proceedManual()
  }

  function toggleMulti(value: string, maxSelect?: number) {
    const current: string[] = answersRef.current[q.id] || []
    if (current.includes(value)) {
      setAnswer(q.id, current.filter(v => v !== value))
      return
    }
    if (maxSelect && current.length >= maxSelect) {
      // tapping a new option at the cap previously did nothing visible at
      // all — briefly flash the "Select up to N" label so it's clear the
      // tap registered but was rejected, not just unresponsive.
      setMaxSelectHit(true)
      after(400, () => setMaxSelectHit(false))
      return
    }
    setAnswer(q.id, [...current, value])
  }

  // Field-of-study picks (QOFS): up to 2, and "I have not studied at university" excludes everything else.
  function toggleField(value: string) {
    const current: string[] = answersRef.current['QOFS'] || []
    if (value === 'not_applicable') {
      setAnswer('QOFS', current.includes(value) ? [] : [value])
      return
    }
    const base = current.filter(v => v !== 'not_applicable')
    if (base.includes(value)) {
      setAnswer('QOFS', base.filter(v => v !== value))
      return
    }
    if (base.length >= 2) {
      setMaxSelectHit(true)
      after(400, () => setMaxSelectHit(false))
      return
    }
    setAnswer('QOFS', [...base, value])
  }

  function continueFromReveal() {
    const next = pendingRef.current
    if (next >= total) setPhase('finish')
    else {
      // revealMsg.chapter is the chapter just finished (0-based), so +2 = the chapter now starting (2..5).
      if (revealMsg) {
        const chapter = revealMsg.chapter + 2
        trackOnce(`assessment_chapter_${chapter}:${getTelemetrySessionId()}`, 'assessment_chapter', { chapter })
      }
      setIndex(next)
      setMaxIndex(m => Math.max(m, next))
      setPhase('question')
    }
    setEnterKey(k => k + 1)
  }

  async function handleSubmit() {
    if (submitting) return
    const finalAnswers = { ...answers, ...autoFills }
    // Field of study: the single QOFS list is turned into the same three values the old QO5 / QO5D1 / QO5D2
    // questions produced (broad fields, then up to two specific areas), so the backend and reports are unchanged.
    // Only picks that really exist in SPECIALISMS are kept.
    const fsPicks: string[] = Array.isArray(finalAnswers['QOFS']) ? finalAnswers['QOFS'].slice(0, 2) : []
    const fsFields: string[] = []
    const fsAreas: string[] = []
    for (const p of fsPicks) {
      if (p === 'other') { if (!fsFields.includes('other')) fsFields.push('other'); continue }
      const field = Object.keys(SPECIALISMS).find(f => p.startsWith(`${f}_`) && SPECIALISMS[f].includes(p.slice(f.length + 1)))
      if (!field) continue
      if (!fsFields.includes(field)) fsFields.push(field)
      fsAreas.push(p)
    }
    finalAnswers['QO5'] = fsFields.length ? fsFields : ['not_applicable']
    finalAnswers['QO5D1'] = fsAreas[0] ?? ''
    finalAnswers['QO5D2'] = fsAreas[1] ?? ''
    if (fsFields.includes('other')) finalAnswers['QO5_other'] = String(finalAnswers['QOFS_other'] ?? '').trim()
    else delete finalAnswers['QO5_other']
    // Optional "field you have in mind": trimmed, and left out entirely when skipped.
    const fieldInMind = String(finalAnswers['QOFIELD'] ?? '').trim()
    if (fieldInMind) finalAnswers['QOFIELD'] = fieldInMind
    else delete finalAnswers['QOFIELD']
    const goalAnswer = finalAnswers['QO5C'] || finalAnswers['QO5C_PRO'] || finalAnswers['QO5C_HS'] || ''
    // How they came to their field (QO5A) is stored as yes/no; "something else" stays unset and its typed text travels in answers.
    const ownChoice = ['wanted', 'guided'].includes(finalAnswers['QO5A']) ? 'yes'
      : ['still_deciding', 'not_chosen'].includes(finalAnswers['QO5A']) ? 'no' : null
    setSubmitting(true)
    setError('')
    try {
      const result = await apiAuthPost<{ response_id: string; claim_token?: string }>('/assessment/submit', {
        full_name: answers['QD1'],
        email: answers['QD2'],
        phone: answers['QD3'],
        country: answers['QO1'],
        nationality: answers['QO2'],
        age: Number(answers['QO3']),
        experience_level: answers['QO3B'],
        current_stage: answers['QO4'],
        education_field: finalAnswers['QO5'] || [],
        major_was_own_choice: ownChoice,
        major_choice_reason: ownChoice === 'no' ? (finalAnswers['QO5B'] || null) : null,
        // "Other (type your own)" on the goal question is scored as "not sure"; the typed text travels in answers.
        career_direction: goalAnswer === 'other' ? 'not_sure' : (goalAnswer || null),
        sectors_of_interest: answers['QO6'] || [],
        career_structure: answers['QO7'],
        languages: answers['QO8'] || [],
        geographic_openness: answers['QO9'],
        why_here: finalAnswers['QO10'] || goalAnswer || 'not_asked',
        answers: finalAnswers,
        completed: true,
        locale,
        telemetry_session_id: getTelemetrySessionId(),
      })
      // Proof that this browser took the assessment: lets the report be saved to the account created later.
      try { if (result.claim_token) window.localStorage.setItem(`claim:${result.response_id}`, result.claim_token) } catch {}
      // The email typed here, so the sign-up page can pre-fill it (an account with this email also picks the report up by email).
      try { window.localStorage.setItem(`claimEmail:${result.response_id}`, String(answers['QD2'] || '').trim()) } catch {}
      track('assessment_complete', { lang: locale })
      clearDraft()
      // this attempt is done — flush what's queued so it isn't lost, then
      // start a fresh session id for any future retake.
      flushTelemetry()
      rotateTelemetrySession()
      setLeaving(true)
      // Marks this as a fresh completion so the results page shows the inline
      // beta feedback survey — a bookmarked/emailed link back to the same
      // results page later should not re-trigger it.
      try { sessionStorage.setItem(`justCompleted:${result.response_id}`, '1') } catch {}
      // navigate once the .leaving fade (500ms, see .assess-screen in globals.css)
      // has actually finished, instead of cutting it off mid-transition
      after(520, () => router.push(`/results/${result.response_id}`))
    } catch (err: any) {
      console.error('Submission error:', err)
      setError(err?.message === 'retake_not_included' ? chrome.retakeNotIncluded : (err?.message || tForm('error')))
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
      <div className="assess-topbar">
        <Logomark size={30} tone="dark" />
        <div className="assess-topbar-actions">
          <BugReportModal locale={locale as 'en' | 'ar'} page={q ? `${phase}:${q.id}` : phase} />
          <button className="assess-lang" onClick={() => switchLocale(locale === 'en' ? 'ar' : 'en')}>
            {locale === 'en' ? 'العربية' : 'English'}
          </button>
        </div>
      </div>

      {phase === 'question' && (
        <>
          <div className="assess-progress-label">{progressMsg}</div>
          <div className="assess-break-mobile-slot">
            <BreakPanel locale={locale as 'en' | 'ar'} eyebrow={chrome.asideEyebrow} progressMsg={progressMsg} questionIndex={index} compact hideTrigger={coachEnabled || !gamesEnabled} />
          </div>
        </>
      )}

      {/* ── main: ambient panel (left on desktop) + question column (right) ── */}
      <div className="assess-main">
        <aside className="assess-aside">
          <div className="cst-wrap">
            {/* <Constellation geometry={CHAPTER_CONSTELLATION} litCount={litCount} theme={phase === 'reveal' ? 'teal' : 'dark'} rippleKey={rippleKey} accent="#00C9A7" /> */}
            <ChapterStars
              litCount={litCount} progress={journeyProgress} theme={phase === 'reveal' ? 'teal' : 'dark'}
              rippleKey={rippleKey} accent="#00C9A7"
              youLabel={phase === 'question' ? chrome.youLabel : undefined}
              nextLabel={phase === 'question' ? starShort(starTarget) : undefined}
            />
            {/* "Your journey / Each star is a chapter…" heading removed: too much text; the map explains itself
            {phase === 'question' && (
              <div className="cst-heading">
                <strong>{chrome.journeyTitle}</strong>
                <span>{chrome.journeySub}</span>
              </div>
            )} */}
            {phase === 'question' && (
              <div className="cst-progress-text">
                {journeyCaption}
              </div>
            )}
          </div>
          {/* Sarah's home on desktop: between the stars and the writing */}
          {coachEnabled && <div className="coach-slot" ref={setCoachSlot} />}
          {/* desktop-only progress context beneath the constellation */}
          <div className="assess-aside-context">
            {phase === 'question' ? (
              <BreakPanel locale={locale as 'en' | 'ar'} eyebrow={percentLabel} progressMsg={progressMsg} questionIndex={index} hideTrigger={coachEnabled || !gamesEnabled} />
            ) : (
              <div className="assess-aside-eyebrow">{percentLabel}</div>
            )}
          </div>
        </aside>

        {/* ── question ──────────────────────────────────────────────────── */}
        <div className="assess-content">
          {coachEnabled && <div className="coach-spot coach-spot-question" ref={setCoachQuestionSlot} />}
          {phase === 'question' && q && (
            <div className="assess-stage">
              <div
                className={`qbody ${confirming ? 'confirming' : ''}`}
                key={`q-${index}-${enterKey}`}
                onKeyDown={handleStageKeyDown}
              >
            {/* old: section name — <div className="qsection">{safe(() => tSections(q.section), q.section)}</div> */}
            <div className="qsection">{chapterLabel(curChapter)} · {chapterTitle(curChapter)}</div>

            {q.type === 'behavioral_scale' && (
              <>
                <div className="qcard"><p className="qtext">{qTextStr}</p></div>
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
                <p className="choice-prompt">{qTextStr}</p>
                {/* "this or that" cards: big centred cards, with an "or" chip between the two sides of an A/B pair */}
                <div className={`choices cards cards-${q.options?.length ?? 0}`}>
                  {q.options?.map((opt, k) => (
                    <Fragment key={opt.value}>
                      {k > 0 && (q.options?.length ?? 0) === 2 && <span className="choice-or" aria-hidden="true">{chrome.or}</span>}
                      <button
                        className={`choice ${sel === opt.value ? 'sel' : ''} ${sel && sel !== opt.value ? 'dim' : ''}`}
                        onClick={() => pick(opt.value)}
                      >
                        <span className="choice-tag">{opt.value}</span>
                        <span className="choice-text">{tQ(`${mid}.options.${opt.value}`)}</span>
                      </button>
                    </Fragment>
                  ))}
                </div>
              </div>
            )}

            {q.type === 'single_select' && (
              <>
                <div className="qcard"><p className="qtext">{qTextStr}</p></div>
                <div className="pills">
                  {q.options?.map(opt => (
                    <button key={opt.value} className={`pill ${sel === opt.value ? 'sel' : ''}`} onClick={() => pick(opt.value)}>
                      <span className="pill-label">{tQ(`${mid}.options.${opt.value}`)}</span>
                    </button>
                  ))}
                </div>
                {sel === 'other' && (
                  <input
                    className="qinput"
                    style={{ marginTop: 12 }}
                    type="text"
                    value={answers[`${q.id}_other`] || ''}
                    onChange={e => setAnswer(`${q.id}_other`, e.target.value)}
                    placeholder={tForm('otherPlaceholder')}
                    autoFocus
                  />
                )}
              </>
            )}

            {q.type === 'multi_select' && (
              <>
                <div className="qcard"><p className="qtext">{qTextStr}</p></div>
                {q.maxSelect && <p className={`qsection ${maxSelectHit ? 'shake' : ''}`} style={{ marginBottom: 12 }}>{tForm('selectUpTo', { max: q.maxSelect })}</p>}
                {q.id === 'QO5' && (
                  <FieldOfStudyInfo
                    locale={locale === 'ar' ? 'ar' : 'en'}
                    optionLabels={(q.options || []).map(opt => ({ value: opt.value, label: tQ(`${mid}.options.${opt.value}`) }))}
                  />
                )}
                {q.id === 'QOFS' ? (
                  <FieldOfStudySelect
                    groups={Object.entries(SPECIALISMS).map(([field, areas]) => ({
                      field,
                      title: tQ(`QO5.options.${field}`),
                      items: areas.map(a => ({ value: `${field}_${a}`, label: tQ(`QO5D.options.${field}_${a}`) })),
                    }))}
                    extras={(q.options || []).map(opt => ({ value: opt.value, label: tQ(`${mid}.options.${opt.value}`) }))}
                    selected={answers[q.id] || []}
                    onToggle={toggleField}
                    searchPlaceholder={tForm('searchFields')}
                    noMatch={tForm('noMatchField')}
                    extrasTitle={tForm('fieldExtrasTitle')}
                  />
                ) : q.id === 'QO6' ? (
                  <IconTiles
                    options={(q.options || []).map(opt => ({ value: opt.value, label: tQ(`${mid}.options.${opt.value}`) }))}
                    selected={answers[q.id] || []}
                    onToggle={v => toggleMulti(v, q.maxSelect)}
                  />
                ) : q.id === 'QO8' ? (
                  <LanguageSelect
                    options={(q.options || []).map(opt => ({ value: opt.value, label: tQ(`${mid}.options.${opt.value}`) }))}
                    selected={answers[q.id] || []}
                    onToggle={v => toggleMulti(v, q.maxSelect)}
                    locale={locale}
                    searchPlaceholder={tForm('searchLanguages')}
                    noMatch={tForm('noMatch')}
                  />
                ) : (
                <div className="pills">
                  {q.options?.map(opt => {
                    const selected: string[] = answers[q.id] || []
                    const on = selected.includes(opt.value)
                    return (
                      <button key={opt.value} className={`pill ${on ? 'sel' : ''}`} onClick={() => toggleMulti(opt.value, q.maxSelect)}>
                        <span className="pill-check">{on && '✓'}</span>
                        <span className="pill-label">{tQ(`${mid}.options.${opt.value}`)}</span>
                      </button>
                    )
                  })}
                </div>
                )}
                {(answers[q.id] || []).includes('other') && (
                  <input
                    className="qinput"
                    style={{ marginTop: 12 }}
                    type="text"
                    value={answers[`${q.id}_other`] || ''}
                    onChange={e => setAnswer(`${q.id}_other`, e.target.value)}
                    placeholder={tForm('otherPlaceholder')}
                    autoFocus
                  />
                )}
              </>
            )}

            {(q.type === 'text_input' || q.type === 'email_input') && (
              <>
                <div className="qcard"><p className="qtext">{qTextStr}</p></div>
                <input
                  className="qinput"
                  type={q.type === 'email_input' ? 'email' : 'text'}
                  value={answers[q.id] || ''}
                  onChange={e => setAnswer(q.id, e.target.value)}
                  placeholder={q.optional ? tForm('optionalPlaceholder') : tForm('placeholder')}
                  maxLength={q.optional ? 80 : undefined}
                  autoFocus
                />
                {q.id === 'QD2' && (
                  <p style={{ margin: '10px 4px 0', fontSize: 13, lineHeight: 1.5, opacity: 0.7 }}>{tForm('emailConsent')}</p>
                )}
                {q.id === 'QD1' && (
                  <p style={{ margin: '10px 4px 0', fontSize: 13, lineHeight: 1.5, opacity: 0.7 }}>{chrome.unlockNote}</p>
                )}
              </>
            )}

            {q.type === 'number_input' && (
              <>
                <div className="qcard"><p className="qtext">{qTextStr}</p></div>
                {q.id === 'QO3' && !ageTyping ? (
                  <AgeWheel
                    value={String(answers[q.id] ?? '')}
                    onChange={v => setAnswer(q.id, v)}
                    hint={chrome.ageHint}
                    typeLabel={chrome.ageType}
                    onType={() => setAgeTyping(true)}
                  />
                ) : (
                  <>
                    <input
                      className="qinput"
                      type="number"
                      inputMode="numeric"
                      step={1}
                      min={10}
                      max={100}
                      value={answers[q.id] || ''}
                      onChange={e => setAnswer(q.id, e.target.value)}
                      placeholder={tForm('placeholder')}
                      autoFocus
                    />
                    {q.id === 'QO3' && (
                      <button type="button" className="age-type" onClick={() => setAgeTyping(false)}>{chrome.ageWheelBack}</button>
                    )}
                  </>
                )}
              </>
            )}

            {q.type === 'phone_input' && (
              <>
                <div className="qcard"><p className="qtext">{qTextStr}</p></div>
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
              {(MANUAL_TYPES.has(q.type) || sel === 'other') && (
                <button
                  className="cta"
                  style={{ width: '100%' }}
                  disabled={!isAnswerValid(q) || checking}
                  onClick={proceedManual}
                >
                  {/* tForm('next') already carries a bundled arrow (shared with the legacy
                      form's plain-text buttons) — strip it here since we render our own
                      animated .cta-arrow span. */}
                  <span>{checking ? '…' : (q.optional && !String(answers[q.id] ?? '').trim() ? tForm('skip') : tForm('next').replace(/[→←]\s*$/, ''))}</span>
                  {!checking && <span className="cta-arrow">{arrow}</span>}
                </button>
              )}
              <div className="step-nav">
                <button
                  type="button"
                  className="step-arrow"
                  disabled={index === 0}
                  onClick={goBack}
                >
                  {tForm('back')}
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
                    onClick={goForward}
                  >
                    {tForm('forward')}
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
            {/* <div className="reveal-spark">✦</div>  — replaced by the star map: the newly lit star, and the next one named */}
            <div className="reveal-stars">
              <ChapterStars litCount={litCount} progress={litCount} theme="dark" rippleKey={rippleKey} accent="#FFFFFF"
                youLabel={chrome.youLabel} nextLabel={revealMsg.chapter + 1 < CHAPTER_COUNT ? starShort(revealMsg.chapter + 1) : undefined} />
            </div>
            <div className="reveal-chapter">{chapterDoneLabel(revealMsg.chapter)} · {starLitLabel(revealMsg.chapter)} ✦</div>
            <h1 className="reveal-head">{revealMsg.head}</h1>
            <p className="reveal-body">{revealMsg.body}</p>
            {revealMsg.chapter + 1 < CHAPTER_COUNT && (
              <p className="reveal-next">{chrome.chapterNext}: {chapterLabel(revealMsg.chapter + 1)} · {chapterTitle(revealMsg.chapter + 1)}</p>
            )}
          </div>
          <button className="cta" data-track="assessment_continue" onClick={continueFromReveal}>
            <span>{chrome.revealCta}</span>
            <span className="cta-arrow">{arrow}</span>
          </button>
        </div>
      )}

      {/* ── finish (full-screen overlay) ────────────────────────────────── */}
      {phase === 'finish' && (
        <div className="reveal finish" key={`fn-${enterKey}`}>
          <div className="reveal-inner">
            {/* <div className="reveal-spark">✦</div>  — replaced by the finished star map */}
            <div className="reveal-stars">
              <ChapterStars litCount={CHAPTER_COUNT} progress={CHAPTER_COUNT} theme="dark" rippleKey={rippleKey} accent="#FFFFFF" />
            </div>
            <div className="reveal-chapter">{chapterDoneLabel(CHAPTER_COUNT - 1)} · {starLitLabel(CHAPTER_COUNT - 1)} ✦</div>
            <h1 className="reveal-head">{chrome.finishHead}</h1>
            <p className="reveal-body">{chrome.finishBody}</p>
            {error && <p style={{ color: '#e11d48', fontSize: 14, marginTop: 12 }}>{error}</p>}
          </div>
          <button className="cta" data-track="assessment_submit" onClick={handleSubmit} disabled={submitting}>
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
            <p className="text-sm text-charcoal/60">{retakeBlocked ? chrome.welcomeBodyBlocked : chrome.welcomeBody}</p>
            <div className="flex flex-col gap-3 pt-2">
              <button className="cta" data-track="assessment_view_previous_result" style={{ width: '100%' }} onClick={() => router.push(`/results/${existingResultId}`)}>
                {chrome.viewPrevious}
              </button>
              {!retakeBlocked && (
              <button
                className="w-full py-3 rounded-2xl border border-[var(--line-strong)] text-charcoal/70 font-medium hover:bg-lightblue transition-colors"
                onClick={() => {
                  setShowExistingModal(false)
                  doAdvance()
                }}
              >
                {chrome.retake}
              </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── already-has-an-account modal ────────────────────────────────── */}
      {showClaimedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" dir={dir}>
          <div className="card w-full max-w-sm p-8 space-y-4">
            <h3 className="text-lg font-extrabold text-charcoal">This email already has an account</h3>
            <p className="text-sm text-charcoal/60">Log in to view your previous results.</p>
            <div className="flex flex-col gap-3 pt-2">
              <button className="cta" data-track="assessment_login" style={{ width: '100%' }} onClick={() => router.push('/login')}>
                Log in
              </button>
              <button
                className="w-full py-3 rounded-2xl border border-[var(--line-strong)] text-charcoal/70 font-medium hover:bg-lightblue transition-colors"
                onClick={() => {
                  setShowClaimedModal(false)
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
      {draft && !retakeBlocked && (
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
      {/* <CoachBubble locale={locale as 'en' | 'ar'} message={phase === 'question' ? coachMsg : null} onDismiss={dismissCoach} /> */}
      {coachEnabled && <CoachWidget
        locale={locale as 'en' | 'ar'} mode="assessment" sessionId={getTelemetrySessionId}
        questionIndex={index + 1} questionTotal={total}
        getQuestion={() => {
          if (phase !== 'question' || !q || !qTextStr) return null
          const hasChoices = q.type === 'single_select' || q.type === 'multi_select' || q.type === 'forced_choice'
          return {
            text: qTextStr, type: q.type,
            options: hasChoices ? (q.options || []).slice(0, 10).map(o => (rawQ?.dynamic ? o.label : tQ(`${mid}.options.${o.value}`))) : undefined,
          }
        }}
        place={phase === 'question' ? coachSide : 'center'}
        spots={phase === 'question' ? { wide: [coachSlot, coachQuestionSlot], narrow: [] } : undefined}
        spotIndex={coachSpot}
        games={gamesEnabled} tipOffersGame={gamesEnabled && phase === 'question' && coachTipGame}
        tip={phase === 'question' ? coachMsg : phase === 'reveal' ? revealTip : null}
        tipAutoHideMs={phase === 'reveal' ? 0 : 9000} onTipDismiss={dismissCoach}
      />}
    </div>
  )
}

/* // tSections may throw for an unmapped key; fall back to the raw section name.
function safe(fn: () => string, fallback: string): string {
  try {
    return fn()
  } catch {
    return fallback
  }
} */
