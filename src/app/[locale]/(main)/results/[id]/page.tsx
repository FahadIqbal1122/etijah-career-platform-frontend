'use client'

import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { apiGet, apiAuthGet, apiAuthPost, apiAuthDelete, apiAuthGetBlob } from '@/lib/api'
import { CopyLinkButton } from '@/components/CopyLinkButton'
import { Link, useRouter, usePathname } from '@/i18n/navigation'
import { setLocaleLock } from '@/lib/localeLock'
import { supabase } from '@/lib/supabase'
import Logomark from '@/components/brand/Logomark'
import Constellation from '@/components/brand/Constellation'
import { LockedSection } from '@/components/shared/LockedSection'
import { BlurGate } from '@/components/shared/BlurGate'
import BetaFeedbackStage1 from '@/components/beta-feedback/BetaFeedbackStage1'
import BreakPanel from '@/components/BreakPanel'
// import CoachBubble from '@/components/CoachBubble'   // replaced by CoachWidget (two-way chat)
import CoachWidget from '@/components/CoachWidget'
import { resultsAdvice, type Bi } from '@/data/coachMessages'
import BetaFeedbackResultStage from '@/components/beta-feedback/BetaFeedbackResultStage'

const levelToWidth: Record<string, string> = {
  low: '20%',
  'low-moderate': '38%',
  moderate: '52%',
  'moderate-high': '68%',
  high: '88%',
}

// Links for exposure ideas and majors come from the backend (a known programme's site or a web search). Only
// https addresses are ever opened.
const safeLink = (link: any): boolean => typeof link?.url === 'string' && link.url.startsWith('https://')

// Small icons for pills and labels (heroicons outline paths).
const PILL_ICONS = {
  check: 'M4.5 12.75l6 6 9-13.5',
  search: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z',
  sparkles: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z',
  layers: 'M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3',
  shield: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
  flag: 'M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5',
} as const
function PillIcon({ name, size }: { name: keyof typeof PILL_ICONS; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden="true" width={size} height={size}>
      <path strokeLinecap="round" strokeLinejoin="round" d={PILL_ICONS[name]} />
    </svg>
  )
}

// Brand section header (teal icon tile + title/subtitle) used across the report.
function SectionHead({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-10 h-10 rounded-xl bg-lightblue flex items-center justify-center shrink-0 text-primary">
        {icon}
      </div>
      <div>
        <h3 className="rp-title text-charcoal">{title}</h3>
        <p className="rp-sub">{subtitle}</p>
      </div>
    </div>
  )
}

// Fake, generic rows used only to give the blur-gate something to blur when
// the backend has already returned zero real data for a free-tier viewer.
function CoursesPlaceholder() {
  const t = useTranslations('results.courses')
  return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-start justify-between gap-3 border border-[var(--line)] rounded-xl p-3.5">
          <div className="min-w-0">
            <p className="rp-h text-charcoal truncate">{t('placeholderTitle')}</p>
            <p className="rp-sub truncate">{t('placeholderMeta')}</p>
          </div>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 border bg-lightblue text-primary border-[var(--line)]">{t('paid')}</span>
        </div>
      ))}
    </div>
  )
}

function CompaniesPlaceholder() {
  const t = useTranslations('results.companies')
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-center justify-between gap-3 border border-[var(--line)] rounded-xl p-3">
          <div className="min-w-0">
            <p className="rp-h text-charcoal truncate">{t('placeholderName')}</p>
            <p className="rp-sub truncate">{t('placeholderSector')}</p>
          </div>
          <span className="chip !py-0.5 !text-xs">{t('view')}</span>
        </div>
      ))}
    </div>
  )
}

function AiImpactDeepDivePlaceholder() {
  const t = useTranslations('results.aiImpact')
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="border border-[var(--line)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="rp-h text-charcoal">{t('placeholderTitle')}</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal/10 text-teal">{t('placeholderRisk')}</span>
          </div>
          <p className="rp-sub mb-2">{t('placeholderOutlook')}</p>
          <div className="flex flex-wrap gap-1.5">
            <span className="chip chip-teal !py-0.5 !text-xs">{t('placeholderSkill')}</span>
            <span className="chip chip-teal !py-0.5 !text-xs">{t('placeholderSkill')}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// true = the coach asks the beta feedback questions (CoachFeedback); false = the original form cards
// (BetaFeedbackStage1 on the loading screen, BetaFeedbackResultStage at the end of the report).
const COACH_FEEDBACK = true

const COACH_NUDGE_STAGE1 = { en: 'Two quick taps and I’ll show your report', ar: 'نقرتان سريعتان وسأعرض لك تقريرك' }
const COACH_NUDGE_RESULT = { en: 'One quick question before you go?', ar: 'سؤال سريع قبل أن تغادر؟' }

export default function ResultsPage() {
  const params = useParams()
  const id = params.id as string
  const locale = useLocale() as 'en' | 'ar'
  const t = useTranslations('results')
  const riasecLabel = (type: string) => t.has(`riasecTypes.${type}`) ? t(`riasecTypes.${type}` as any) : type
  const valueLabel = (v: string) => t.has(`valueNames.${v}`) ? t(`valueNames.${v}` as any) : v
  const strengthLabel = (s: string) => t.has(`strengthNames.${s}`) ? t(`strengthNames.${s}` as any) : s
  const traitLabel = (trait: string) => t.has(`bigFiveTraits.${trait}`) ? t(`bigFiveTraits.${trait}` as any) : trait.replace(/_/g, ' ')
  const levelLabel = (level: string) => t.has(`levels.${level}`) ? t(`levels.${level}` as any) : level

  const [summary, setSummary] = useState<any>(null)
  // 0-100 score per dimension (same numbers the PDF shows), so the profile can show a percentage for each type
  const [scoreMap, setScoreMap] = useState<Record<string, number>>({})
  const [recentCompletions, setRecentCompletions] = useState<number | null>(null)
  // One-way coach bubble: one tip built from the user's own results, shown once per visit
  const [coachMsg, setCoachMsg] = useState<Bi | null>(null)
  const coachShown = useRef(false)
  const dismissCoach = useCallback(() => setCoachMsg(null), [])
  const [tier, setTier] = useState<'free' | 'pathfinder' | 'launchpad'>('launchpad')
  const [betaMode, setBetaMode] = useState(false)
  const [stage1Done, setStage1Done] = useState(false)
  const [resultStageDone, setResultStageDone] = useState(false)
  // Local "already answered" markers, same keys the original form cards write.
  const [stage1Marker] = useState(() => {
    try { return typeof window !== 'undefined' && window.localStorage.getItem(`betaStage1Done:${id}`) === '1' } catch { return false }
  })
  const [resultMarker] = useState(() => {
    try { return typeof window !== 'undefined' && window.localStorage.getItem(`betaResultStageDone:${id}`) === '1' } catch { return false }
  })
  const [resultFeedbackDone, setResultFeedbackDone] = useState(false)
  // The coach drifts over to the feedback question once the reader reaches the end of the report.
  const [resultFeedbackReached, setResultFeedbackReached] = useState(false)
  const feedbackAnchorRef = useCallback((el: HTMLDivElement | null) => {
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { setResultFeedbackReached(true); io.disconnect() }
    }, { threshold: 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  // Only true right after AssessmentForm's submit redirect sets this flag — a
  // revisit of the same results link (bookmark, email) later should not show
  // the inline beta feedback survey again.
  const [justCompleted] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      const key = `justCompleted:${id}`
      const flag = sessionStorage.getItem(key) === '1'
      if (flag) sessionStorage.removeItem(key)
      return flag
    } catch {
      return false
    }
  })
  const [error, setError] = useState('')
  const [jobs, setJobs] = useState<any[]>([])
  const [actionPlan, setActionPlan] = useState<any>(null)
  // The direction the user chose to build their plan around (paid): { label, source, plan, locales } | null
  const [direction, setDirection] = useState<any>(null)
  const [dirPicking, setDirPicking] = useState(false)
  const [dirChoice, setDirChoice] = useState('')
  const [dirTyped, setDirTyped] = useState('')
  const [dirBusy, setDirBusy] = useState(false)
  const [dirLoaded, setDirLoaded] = useState(false)
  // The plan is built on the server after the assessment's optional "field you have in mind" answer; while it is
  // being built the direction endpoint says `pending` and the page polls.
  const [dirPending, setDirPending] = useState<string | null>(null)
  const [dirFailed, setDirFailed] = useState<string | null>(null)
  const [dirRequested, setDirRequested] = useState<string | null>(null)
  const [dirTick, setDirTick] = useState(0)
  const [dirSlow, setDirSlow] = useState(false)
  const dirPolls = useRef(0)
  // Careers the user marked "not for me": career title -> reason. Feedback only, it never changes scores.
  const [recFeedback, setRecFeedback] = useState<Record<string, string>>({})
  const [feedbackOpen, setFeedbackOpen] = useState<string | null>(null)
  // Which careers have their AI-impact panel open. Unset = the top match is open, the rest collapsed.
  const [aiOpen, setAiOpen] = useState<Record<string, boolean>>({})
  const [dirError, setDirError] = useState('')
  const [jobsSuggestionsLoading, setJobsSuggestionsLoading] = useState(true)
  const [aiImpact, setAiImpact] = useState<any>(null)
  const [jobListings, setJobListings] = useState<any[]>([])
  const [isStillEnrolled, setIsStillEnrolled] = useState(false)
  const [route, setRoute] = useState<string>('')
  const [sectionOrder, setSectionOrder] = useState<string[] | null>(null)
  // Sections the reader has folded away (all open by default).
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const [careerDirection, setCareerDirection] = useState<string | null>(null)
  const [studentTrack, setStudentTrack] = useState<any>(null)
  const [certifications, setCertifications] = useState<any>(null)
  const [careerPath, setCareerPath] = useState<any>(null)
  const [aiLoading, setAiLoading] = useState(true)
  const [jobsLoading, setJobsLoading] = useState(true)
  const [companies, setCompanies] = useState<any[]>([])
  const [companiesLoading, setCompaniesLoading] = useState(false)
  const [companiesError, setCompaniesError] = useState(false)
  const [courses, setCourses] = useState<any[]>([])
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [coursesError, setCoursesError] = useState(false)
  const [savedJobs, setSavedJobs] = useState<Set<number>>(new Set())
  const [saveError, setSaveError] = useState('')
  const [email, setEmail] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [reassessing, setReassessing] = useState(false)
  const [reassessError, setReassessError] = useState('')
  const [downloadingReport, setDownloadingReport] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const [reportLocale, setReportLocale] = useState<'en' | 'ar'>('en')
  const [reportLocaleKnown, setReportLocaleKnown] = useState(false)
  const localeRouter = useRouter()
  const localePathname = usePathname()
  const [retryKey, setRetryKey] = useState(0)
  // (state for the per-career plan buttons; hooks must stay above the early returns below)
  const [planBuilding, setPlanBuilding] = useState<string | null>(null)
  const [planError, setPlanError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session)
    })
  }, [])

  useEffect(() => {
    // Right after the assessment-submit redirect (or a fresh page load), the
    // Supabase client can still be hydrating its session when this effect
    // fires. Waiting on getSession() first means the very first request for
    // an owned response already carries a token, instead of relying solely
    // on lib/api.ts's post-401 retry to recover it.
    let cancelled = false
    supabase.auth.getSession().then(() => {
      if (cancelled) return
      apiAuthGet<any>(`/assessment/${id}/results`)
        .then(data => {
          setSummary(data.summary)
          setScoreMap(Object.fromEntries((data.results || []).map((r: any) => [r.dimension, Math.round(Number(r.normalized_score) || 0)])))
          setEmail(data.email || '')
          if (data.tier === 'free' || data.tier === 'pathfinder' || data.tier === 'launchpad') setTier(data.tier)
          setIsStillEnrolled(!!data.is_still_enrolled)
          if (typeof data.route === 'string') setRoute(data.route)
          if (Array.isArray(data.section_order)) setSectionOrder(data.section_order)
          if (data.locale === 'ar' || data.locale === 'en') { setReportLocale(data.locale); setReportLocaleKnown(true) }
          setBetaMode(!!data.beta_mode)
          // Server-truth check, not just each child's localStorage flag — covers a
          // cleared/private-mode browser where the client-side "done" marker from a
          // previous answer session wouldn't otherwise be seen. Stage 1 only ever
          // shows right after justCompleted, but the Result Stage widget below can
          // show again on any later revisit, so its status is always worth knowing.
          // Only worth asking at all for beta submissions — skip the round trip
          // entirely for every other (permanent) results-page view.
          if (data.beta_mode) {
            apiAuthGet<{ stage1_completed: boolean; result_stage_completed: boolean }>(`/beta-feedback/${id}/status`)
              .then(statusData => {
                if (justCompleted && statusData.stage1_completed) setStage1Done(true)
                if (statusData.result_stage_completed) setResultStageDone(true)
              })
              .catch(() => {})
          }
        })
        .catch(err => setError(err.message || t('error.loadFailed')))
      apiAuthGet<any>(`/assessment/${id}/recommendation-feedback`)
        .then(data => setRecFeedback(Object.fromEntries((data?.items || []).map((r: any) => [r.career_title, r.reason]))))
        .catch(() => {})
      apiAuthGet<any>(`/assessment/${id}/direction?locale=${locale}`)
        .then(applyDirection)
        .catch(() => {})
        .finally(() => setDirLoaded(true))
      apiAuthGet<any>(`/assessment/${id}/career-recommendations?locale=${locale}`)
        .then(data => {
          setJobs(data.career_recommendations || [])
          setActionPlan(data.action_plan || null)
          setCareerDirection(data.career_direction || null)
        })
        .catch(() => {})
        .finally(() => setJobsSuggestionsLoading(false))
      apiAuthGet<any>(`/assessment/${id}/ai-impact?locale=${locale}`)
        .then(data => setAiImpact(data))
        .catch(() => {})
        .finally(() => setAiLoading(false))
      apiAuthGet<any>(`/assessment/${id}/job-listings`)
        .then(data => setJobListings(data.jobs || []))
        .catch(() => {})
        .finally(() => setJobsLoading(false))
      apiAuthGet<any>(`/assessment/${id}/student-track?locale=${locale}`)
        .then(data => { if (data && (data.locked || data.majors_guidance || data.exposure_ideas?.length)) setStudentTrack(data) })
        .catch(() => {})
      apiAuthGet<any>(`/assessment/${id}/certifications?locale=${locale}`)
        .then(data => { if (data?.certifications?.length) setCertifications(data) })
        .catch(() => {})
      apiAuthGet<any>(`/assessment/${id}/career-path?locale=${locale}`)
        .then(data => { if (data && data.narrative) setCareerPath(data) })
        .catch(() => {})
      // Companies to Target was removed from the report (1 Oct 2026); not fetched any more.
      // apiAuthGet<any[]>(`/assessment/${id}/companies`)
      //   .then(data => { setCompanies(data || []); setCompaniesError(false) })
      //   .catch(() => setCompaniesError(true))
      //   .finally(() => setCompaniesLoading(false))
      apiAuthGet<any[]>(`/assessment/${id}/courses`)
        .then(data => { setCourses(data || []); setCoursesError(false) })
        .catch(() => setCoursesError(true))
        .finally(() => setCoursesLoading(false))
    })
    return () => { cancelled = true }
  }, [id, retryKey, t, locale])

  function retry() {
    setError('')
    setRetryKey(k => k + 1)
  }

  useEffect(() => {
    apiGet<{ count: number }>('/stats/recent-completions')
      .then(data => setRecentCompletions(data.count))
      .catch(() => {})
  }, [])


  // (hooks stay above the early returns below: a changing hook count crashes the page)
  // Poll while the server builds the plan (up to ~5 minutes: it waits for the main report first, which can take
  // 2-3 minutes on a fresh assessment), then say it is slow instead of claiming it failed.
  useEffect(() => {
    if (dirPending === null) { dirPolls.current = 0; return }
    if (dirPolls.current >= 60) { setDirSlow(true); return }
    const timer = setTimeout(() => {
      dirPolls.current += 1
      apiAuthGet<any>(`/assessment/${id}/direction?locale=${locale}`).then(applyDirection).catch(() => {})
    }, 5000)
    return () => clearTimeout(timer)
  }, [dirPending, dirTick, id, locale])

  useEffect(() => {
    if (!summary || coachShown.current) return
    const type = summary.riasec?.top_types?.[0]
    const strength = summary.strengths?.top_strengths?.[0]
    if (!type || !strength) return
    coachShown.current = true
    const tips = resultsAdvice({
      topType: riasecLabel(type),
      topStrength: strengthLabel(strength),
      resilience: summary.resilience?.workplace_resilience,
    })
    const id = setTimeout(() => setCoachMsg(tips[Math.floor(Math.random() * tips.length)]), 2500)
    return () => clearTimeout(id)
  }, [summary])

  if (error) {
    // A report that belongs to an account can only be opened by that account (or an admin): with no session the
    // server answers "Sign in to view this response". Say that plainly and offer the sign-in, instead of a bare error.
    if (/sign in/i.test(error)) {
      return (
        <div className="min-h-screen brand-surface flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <p className="rp-title text-charcoal mb-2">{t('error.signInToViewTitle')}</p>
            <p className="rp-body text-charcoal/80 mb-5">{t('error.signInToViewBody')}</p>
            <Link href={`/login?next=${encodeURIComponent(`/results/${id}`)}`} className="cta" style={{ padding: '10px 20px', fontSize: 14, borderRadius: 12 }}>
              {t('error.signInToViewCta')}
            </Link>
          </div>
        </div>
      )
    }
    return (
      <div className="min-h-screen brand-surface flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-rose-500 text-sm mb-4">{error}</p>
          <button onClick={retry} className="cta" style={{ padding: '10px 20px', fontSize: 14, borderRadius: 12 }}>
            {t('error.tryAgain')}
          </button>
        </div>
      </div>
    )
  }

  const allLoaded = !!summary && !jobsSuggestionsLoading && !aiLoading && !jobsLoading && !companiesLoading && !coursesLoading

  // On a fresh completion (justCompleted), hold the report back until the
  // user has answered the stage-1 feedback survey, even after the data
  // itself is ready — this is the only time the survey shows, so it's also
  // the only time we gate on it. A later revisit (justCompleted false)
  // always falls straight through to the report once loaded.
  const awaitingStage1 = betaMode && justCompleted && !stage1Done && !(COACH_FEEDBACK && stage1Marker)

  // Listings are titled "Internships" only when every listing is an internship. Final-year students and recent
  // graduates get internships and entry-level jobs together, which is titled "Live Job Postings" with an
  // "Internship" tag on the internships.
  const listingsAsInternships = isStillEnrolled && !jobListings.some((j: any) => !j.is_internship)

  // "Posted 3 days ago" from the listing's ISO date, in the page language.
  function postedLabel(iso?: string | null): string | null {
    if (!iso) return null
    const days = Math.floor((Date.now() - Date.parse(iso)) / 86400000)
    if (!Number.isFinite(days) || days < 0) return null
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
    return days < 30 ? rtf.format(-days, 'day') : rtf.format(-Math.floor(days / 30), 'month')
  }
  // "Bachelor's degree · 2+ years' experience" from the requirements the listing states (either part may be absent).
  function requiresLabel(job: any): string | null {
    const parts: string[] = []
    if (job.requires_education && ['high_school', 'associates', 'bachelors', 'postgraduate'].includes(job.requires_education)) {
      parts.push(t(`liveJobs.education.${job.requires_education}`))
    }
    const m = job.requires_experience_months
    if (typeof m === 'number') {
      parts.push(m === 0 ? t('liveJobs.noExperience') : m < 12 ? t('liveJobs.expMonths', { n: m }) : t('liveJobs.expYears', { n: Math.floor(m / 12) }))
    }
    return parts.length ? parts.join(' · ') : null
  }

  // One plan, one focus. With a direction plan (paid) its first step, days 2-7 and 90-day roadmap replace the generic ones
  // from the main report; otherwise the main report's are used. Older cached reports carry a 5-entry week (day 1
  // repeated) and Month 1 / 2-3 / 4-6 phases: still shown, without the repeat.
  const dp = direction?.plan && tier !== 'free' ? direction.plan : null
  const planSrc = dp || actionPlan || {}
  const firstStep = (dp?.first_step?.action ? dp.first_step : actionPlan?.first_step) || null
  let weekPlan: any[] = (dp?.week_plan?.length ? dp.week_plan : actionPlan?.week_plan) || []
  if (weekPlan.length >= 5) weekPlan = weekPlan.slice(1)
  const roadmap = ([
    [t('plan.weeks2to4'), planSrc.weeks_2_4],
    [t('actionPlan.month1'), planSrc.month_1],
    [t('actionPlan.months2to3'), planSrc.months_2_3],
    [t('actionPlan.months4to6'), planSrc.months_4_6],
  ] as [string, string[] | undefined][]).filter(([, items]) => (items?.length ?? 0) > 0)

  async function markCareer(title: string, reason: string) {
    const previous = recFeedback[title]
    setRecFeedback(prev => ({ ...prev, [title]: reason }))
    setFeedbackOpen(null)
    try {
      await apiAuthPost(`/assessment/${id}/recommendation-feedback`, { career_title: title, reason, locale })
    } catch {
      setRecFeedback(prev => {
        const next = { ...prev }
        if (previous) next[title] = previous
        else delete next[title]
        return next
      })
    }
  }
  async function undoCareer(title: string) {
    const previous = recFeedback[title]
    setRecFeedback(prev => { const next = { ...prev }; delete next[title]; return next })
    try {
      await apiAuthDelete(`/assessment/${id}/recommendation-feedback?career_title=${encodeURIComponent(title)}`)
    } catch {
      if (previous) setRecFeedback(prev => ({ ...prev, [title]: previous }))
    }
  }

  function applyDirection(data: any) {
    setDirection(data?.selected || null)
    setDirPending(data?.pending ? (data.pending_label || data?.selected?.label || '') : null)
    setDirFailed(data?.failed_label || null)
    setDirRequested(data?.requested_label || null)
    setDirTick(n => n + 1)
  }


  // Returns null on success, or the error message.
  async function buildDirection(label: string, source: 'suggested' | 'user'): Promise<string | null> {
    setDirBusy(true)
    setDirError('')
    try {
      const r = await apiAuthPost<any>(`/assessment/${id}/direction`, { label, source, locale })
      setDirection(r?.selected || null)
      setDirPicking(false)
      setDirTyped('')
      return null
    } catch (e: any) {
      const msg = e?.message || t('direction.error')
      setDirError(msg)
      return msg
    } finally {
      setDirBusy(false)
    }
  }

  // Working people: build the full plan for one of their top careers, then bring them to it.
  function scrollToPlan() {
    // open the plan section first if the reader had folded it away
    setCollapsedSections(prev => ({ ...prev, plan: false }))
    setTimeout(() => document.getElementById('plan-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }
  async function buildCareerPlan(title: string) {
    setPlanBuilding(title)
    setPlanError('')
    const err = await buildDirection(title, 'suggested')
    if (err) { setPlanError(err); return }
    setPlanBuilding(null)
    setTimeout(scrollToPlan, 100)
  }
  const canBuildPlans = route === 'next_move' && tier !== 'free' && loggedIn

  if (!allLoaded || awaitingStage1) {
    // Match the assessment's blue gradient (brand-hero) instead of the light
    // brand-surface here — the assessment screen fades out on submit straight
    // into this screen, so a matching backdrop avoids a jarring color-flash
    // hand-off between the two pages. We hold the whole report back behind
    // one loader so sections don't pop in piecemeal as each request resolves,
    // and (on first completion only) until feedback is given.
    const reportReadyButAwaitingFeedback = allLoaded && awaitingStage1
    const stages = [
      { done: !!summary, label: t('loading.stages.profile') },
      { done: !jobsSuggestionsLoading, label: t('loading.stages.careers') },
      { done: !aiLoading, label: t('loading.stages.impact') },
      { done: !jobsLoading, label: t('loading.stages.jobs') },
      { done: !coursesLoading, label: t('loading.stages.courses') },
    ]
    const completedCount = stages.filter(s => s.done).length
    // Mirrors AssessmentForm's litCount math (progress -> 8 constellation nodes),
    // so the results-page loader reads as a continuation of the same animation.
    const litCount = Math.max(1, Math.round((completedCount / stages.length) * 7) + 1)
    // Feedback shows for every fresh completion, not just in beta. Only the hold-back (awaitingStage1) stays beta-only.
    // const showFeedbackCol = betaMode && justCompleted
    const showFeedbackCol = justCompleted
    return (
      <div className="min-h-screen brand-hero flex items-center justify-center px-6 py-10">
        <div className="report-loading-grid">
          <div className="report-loading-col report-loading-left">
            <div className="report-loading-logo inline-flex"><Logomark size={44} tone="dark" glow /></div>
            {reportReadyButAwaitingFeedback ? (
              // <p className="text-white/80 text-xl font-semibold">{t('loading.readyAwaitingFeedback')}</p>
              <p className="report-loading-title">{t('loading.readyAwaitingFeedback')}</p>
            ) : (
              <>
                {/* <p className="text-white/80 text-xl font-semibold">{t('loading.preparing')}</p> */}
                <p className="report-loading-title">{t('loading.preparing')}</p>
                <div className="cst-wrap"><Constellation litCount={litCount} rippleKey={completedCount} theme="dark" accent="#00C9A7" /></div>
                <ul className="loading-checklist">
                  {stages.map((s, i) => (
                    <li key={i} className={s.done ? 'done' : ''}>
                      <span className="loading-checklist-icon">{s.done ? '✓' : ''}</span>
                      {s.label}
                    </li>
                  ))}
                </ul>
                {!!recentCompletions && (
                  // <p className="text-teal text-sm font-medium">✦ {t('loading.recentCompletions', { count: recentCompletions })}</p>
                  <p className="report-loading-social">✦ {t('loading.recentCompletions', { count: recentCompletions })}</p>
                )}
                {/* <p className="text-white/75 text-sm leading-relaxed max-w-sm">{t('loading.leaveNote')}</p> */}
                <p className="report-loading-note">{t('loading.leaveNote')}</p>
              </>
            )}
            {showFeedbackCol && (
              <button
                type="button"
                className="report-loading-scroll-hint"
                onClick={() => document.getElementById('report-loading-feedback')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                {t('loading.scrollForFeedback')} <span aria-hidden>↓</span>
              </button>
            )}
          </div>

          {showFeedbackCol && (
            <div className="report-loading-col report-loading-right" id="report-loading-feedback">
              <BreakPanel locale={locale} eyebrow="" progressMsg="" questionIndex={0} compact forceVisible />
              {!COACH_FEEDBACK && <BetaFeedbackStage1 responseId={id} locale={locale} onComplete={() => setStage1Done(true)} />}
            </div>
          )}
        </div>
        {COACH_FEEDBACK && (
          <CoachWidget
            locale={locale as 'en' | 'ar'} mode="results" responseId={id}
            feedback={showFeedbackCol && !stage1Marker ? {
              kind: 'stage1', responseId: id, autoOpen: true, required: reportReadyButAwaitingFeedback,
              nudge: COACH_NUDGE_STAGE1, onDone: () => setStage1Done(true),
            } : undefined}
          />
        )}
      </div>
    )
  }

  async function reassess() {
    setReassessing(true)
    setReassessError('')
    try {
      const [ai, jl] = await Promise.all([
        apiAuthGet<any>(`/assessment/${id}/ai-impact?force=true`),
        apiAuthGet<any>(`/assessment/${id}/job-listings?force=true`),
      ])
      setAiImpact(ai)
      setJobListings(jl.jobs || [])
    } catch (err: any) {
      setReassessError(err.message || t('error.refreshFailed'))
    } finally {
      setReassessing(false)
    }
  }

  // Assessment taken in Arabic: one language only. Pin the page to Arabic (hide the header
  // language switch, and move anyone who opened the English URL over to Arabic).
  const arabicOnly = reportLocaleKnown && reportLocale === 'ar'
  useEffect(() => {
    if (!arabicOnly) return
    setLocaleLock('ar')
    if (locale !== 'ar') localeRouter.replace(localePathname, { locale: 'ar' })
    return () => setLocaleLock(null)
  }, [arabicOnly, locale, localeRouter, localePathname])

  async function downloadReport(reportLang?: 'en' | 'ar') {
    setDownloadingReport(true)
    setDownloadError('')
    try {
      const query = reportLang ? `?locale=${reportLang}` : ''
      const { blob, filename } = await apiAuthGetBlob(`/assessment/${id}/report${query}`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename || 'career-report.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      setDownloadError(e instanceof Error ? e.message : t('error.downloadFailed'))
    } finally {
      setDownloadingReport(false)
    }
  }

  async function saveJob(job: any, index: number) {
    // Mark saved (and the button disabled) before the request lands, not after —
    // otherwise a fast double-click/slow network fires two POSTs for the same
    // job before the first response comes back, creating duplicate tracked
    // applications. Roll back on failure.
    if (savedJobs.has(index)) return
    setSavedJobs(prev => new Set(prev).add(index))
    try {
      await apiAuthPost('/applications', {
        response_id: id,
        job_title: job.title,
        company: job.company,
        location: job.location,
        source: job.source,
        url: job.url,
        matched_career: job.matched_career,
      })
    } catch {
      setSavedJobs(prev => { const next = new Set(prev); next.delete(index); return next })
      setSaveError(t('error.signInToSave'))
    }
  }

  const topType = summary.riasec.top_types[0]
  const riasecCode = summary.riasec.top_types.map((rt: string) => rt[0].toUpperCase()).join('')

  // Report sections as named blocks, rendered in the order the backend returns for this person (section_order,
  // shared with the PDF): what decides and what to do next first, then the stage-specific "build / apply" sections,
  // then the AI context, then the detailed profile. Each block still hides itself when it does not apply.
  // Match a career across lists: AI text sometimes adds the sector, e.g. "Systems Analyst (Technology)".
  const normTitle = (v: any) => String(v || '').replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase()
  const careerCourses = (title: string) => courses.filter((c: any) => normTitle(c.for_career) === normTitle(title))
  // Courses whose career is not one of the cards stay in their own block, so none is lost.
  const orphanCourses = courses.filter((c: any) => !jobs.some((j: any) => normTitle(j.title) === normTitle(c.for_career)))
  const coursesMerged = courses.length > 0 && orphanCourses.length === 0
  const courseCard = (course: any) => (
    <a
      key={course.id}
      href={course.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-[var(--line)] rounded-xl p-3.5 hover:border-[var(--line-strong)] hover:bg-lightblue/50 transition-colors group bg-white text-charcoal"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="rp-h text-charcoal group-hover:text-primary">{course.title}</p>
          <p className="rp-sub">{course.provider} · {course.level}{course.duration_hours ? ` · ${course.duration_hours}h` : ''}</p>
        </div>
        <span className={`rp-pill shrink-0 mt-0.5 ${course.is_free ? 'rp-green' : 'rp-blue'}`}>
          {course.is_free ? t('courses.free') : t('courses.paid')}
        </span>
      </div>
      {course.about && (
        <p className="rp-sub mt-2"><span className="font-bold text-charcoal">{t('courses.about')}:</span> {course.about}</p>
      )}
      {course.why && (
        <p className="rp-sub mt-1"><span className="font-bold text-charcoal">{t('courses.why')}:</span> {course.why}</p>
      )}
    </a>
  )

  // One profile line: name, percentage, bar. Every type looks the same; only the order shows which is highest.
  const scoreRow = (label: string, pct: number) => (
    <div key={label}>
      <div className="flex justify-between items-center mb-1">
        <span className="rp-sub font-medium">{label}</span>
        <span className="rp-pill rp-blue">{pct}%</span>
      </div>
      <div className="w-full bg-lightblue rounded-full h-1.5">
        <div className="bg-primary h-1.5 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )

  const sectionBlocks: Record<string, ReactNode> = {
    summary: (<>
        {/* Short guide to what is on the page, in plain language (the report used to start with data and no explanation) */}
        <div className="card p-5">
          <p className="rp-title text-charcoal mb-1">{t('howToRead.title')}</p>
          <p className="rp-sub mb-3">{t('howToRead.intro')}</p>
          <ul className="space-y-2">
            {(['careers', ...(route === 'choosing_studies' ? ['majors'] : []), 'plan', 'profile'] as const).map(k => {
              const [head, ...rest] = t(`howToRead.${k}`).split(': ')
              return (
                <li key={k} className="rp-body text-charcoal/90 flex gap-2">
                  <span className="text-primary mt-0.5" aria-hidden="true">→</span>
                  <span><span className="font-bold text-charcoal">{head}:</span> {rest.join(': ')}</span>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Top 3 quick cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: t('quickCards.careerType'), value: riasecLabel(summary.riasec.top_types[0]) },
            { label: t('quickCards.topValue'), value: valueLabel(summary.values.top_values[0]) },
            { label: t('quickCards.topStrength'), value: strengthLabel(summary.strengths.top_strengths[0]) },
          ].map(({ label, value }) => (
            <div key={label} className="card p-5 text-center">
              <p className="eyebrow mb-1.5">{label}</p>
              <p className="text-base font-extrabold text-charcoal">{value}</p>
            </div>
          ))}
        </div>

      </>),
    plan: (<>
        {/* Direction plan: built on the server from the optional "field you have in mind" answer at the end of the
            assessment (paid). Free users who gave one see an unlock card; nobody else sees anything here. */}
        {dirLoaded && tier === 'free' && dirRequested && (
          <LockedSection
            tag={t('direction.lockedTag')}
            title={t('direction.lockedTitle')}
            body={t('direction.lockedBody')}
            ctaLabel={t('direction.lockedCta')}
            ctaHref="/#pricing"
          />
        )}
        {/* The results-page direction picker (suggested matches + typed field) is switched off; the same choice is now
            asked at the end of the assessment. Kept here in case it comes back for signed-in owners:
        {jobs.length > 0 && dirLoaded && tier !== 'free' && (!direction || dirPicking) && (
            <div className="card p-5">
              <SectionHead
                title={t('direction.title')}
                subtitle={t('direction.subtitle')}
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" /></svg>}
              />
              <div className="space-y-1.5">
                {jobs.map((j: any) => (
                  <label key={j.title} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm cursor-pointer ${dirChoice === j.title && !dirTyped.trim() ? 'border-primary bg-primary/5' : 'border-[var(--line)]'}`}>
                    <input type="radio" name="direction" className="accent-[var(--primary)]" checked={dirChoice === j.title && !dirTyped.trim()} onChange={() => { setDirChoice(j.title); setDirTyped('') }} />
                    <span className="font-medium text-charcoal capitalize">{j.title}</span>
                  </label>
                ))}
              </div>
              <div className="mt-3">
                <label className="text-xs font-semibold text-charcoal/70">{t('direction.typeLabel')}</label>
                <input
                  type="text"
                  value={dirTyped}
                  maxLength={80}
                  onChange={e => setDirTyped(e.target.value)}
                  placeholder={t('direction.typePlaceholder')}
                  className="mt-1 w-full rounded-xl border border-[var(--line-strong)] px-3 py-2 text-sm"
                />
                <p className="rp-sub mt-1">{t('direction.typeHint')}</p>
              </div>
              {dirError && <p className="text-xs text-rose-500 mt-2">{dirError}</p>}
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  disabled={dirBusy || (!dirTyped.trim() && !dirChoice)}
                  onClick={() => dirTyped.trim() ? buildDirection(dirTyped.trim(), 'user') : buildDirection(dirChoice, 'suggested')}
                  className="cta cta-teal disabled:opacity-50"
                  style={{ padding: '9px 16px', fontSize: 13, borderRadius: 999 }}
                >
                  {dirBusy ? t('direction.building') : t('direction.build')}
                </button>
                {direction && (
                  <button type="button" onClick={() => setDirPicking(false)} className="rp-sub underline">{t('direction.cancel')}</button>
                )}
              </div>
            </div>
        )}
        */}

        {/* Your plan: one section. What it is built around, the first step (day 1), days 2-7, the 90-day roadmap and
            the skills + practice exercise. Free users get the first step; the rest is one unlock card.
            Colours: blue = information, green = do this / you will produce, amber = gap, purple = new idea. */}
        {tier === 'free' && jobs.length > 0 && (
          <div id="plan-section">
            <LockedSection
              tag={t('firstStep.lockedTag')}
              title={t('firstStep.lockedTitle')}
              body={t('firstStep.lockedBody')}
              ctaLabel={t('firstStep.lockedCta')}
              ctaHref="/#pricing"
            />
          </div>
        )}
        {/* cast: TS would otherwise narrow `tier` inside, making the free-tier branches below look unreachable */}
        {(tier as string) !== 'free' && (firstStep?.action || dp) && (
          <div id="plan-section" className="card p-5 border-s-4 border-s-teal">
            <SectionHead
              title={t('plan.title')}
              subtitle={t('plan.subtitle')}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" /></svg>}
            />

            {/* What the plan is built around */}
            <div className="rp-note rp-blue mb-5">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <span className="rp-note-label">{dp ? t('direction.yourDirection') : t('plan.builtAround')}</span>
                  <p className="rp-h capitalize text-charcoal">{dp ? direction.label : (dirPending || jobs[0]?.title || '')}</p>
                </div>
                <span className="rp-pill rp-onblue">{dp ? (direction.source === 'user' ? t('direction.badgeYours') : t('direction.badgeSuggested')) : t('plan.topMatch')}</span>
              </div>
              {dp && (
                <div className="mt-2 space-y-2">
                  {dp.fit_note && <p className="rp-body rp-note-text">{dp.fit_note}</p>}
                  {dp.gap && (
                    <div className="rp-note rp-amber">
                      <span className="rp-note-label">{t('direction.gap')}</span>
                      <p className="rp-body rp-note-text">{dp.gap}</p>
                    </div>
                  )}
                  {dp.reality_check && <p className="rp-sub">{dp.reality_check}</p>}
                  <p className="rp-sub">{t('direction.scoresNote')}</p>
                </div>
              )}
              {!dp && tier !== 'free' && dirPending !== null && (
                <p className="mt-2 rp-sub">{dirSlow ? t('direction.slow') : t('plan.updating')}</p>
              )}
              {!dp && tier !== 'free' && dirFailed && <p className="mt-2 rp-sub">{t('direction.failed')}</p>}
            </div>

            {/* First step = day 1 */}
            {firstStep?.action && (
              <div>
                <p className="rp-label mb-1.5 flex items-center gap-1.5"><span className="rp-pill rp-green"><PillIcon name="flag" />{t('firstStep.title')}</span></p>
                <p className="rp-h text-charcoal">{firstStep.action}</p>
                {firstStep.why && <p className="rp-body text-charcoal/85 mt-2"><span className="font-bold text-charcoal">{t('firstStep.why')}:</span> {firstStep.why}</p>}
                {(firstStep.output || firstStep.when) && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {firstStep.output && (
                      <div className="rp-note rp-green">
                        <span className="rp-note-label">{t('firstStep.output')}</span>
                        <p className="rp-body rp-note-text">{firstStep.output}</p>
                      </div>
                    )}
                    {firstStep.when && (
                      <div className="rp-note rp-blue">
                        <span className="rp-note-label">{t('firstStep.when')}</span>
                        <p className="rp-body rp-note-text">{firstStep.when}</p>
                      </div>
                    )}
                  </div>
                )}
                {firstStep.worksheet?.length > 0 && (
                  <div className="mt-3 rp-note rp-gray">
                    <span className="rp-note-label">{t('firstStep.worksheet')}</span>
                    <ul className="rp-sub list-disc ps-5 space-y-1 mt-1">
                      {firstStep.worksheet.map((w: string, i: number) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                )}
                {firstStep.follow_on && (
                  <p className="mt-3 rp-body text-charcoal/85"><span className="font-bold text-charcoal">{t('firstStep.followOn')}:</span> {firstStep.follow_on}</p>
                )}
              </div>
            )}

            {firstStep?.action && tier === 'free' && (
              <div className="mt-4">
                <LockedSection
                  tag={t('firstStep.lockedTag')}
                  title={t('firstStep.lockedTitle')}
                  body={t('firstStep.lockedBody')}
                  ctaLabel={t('firstStep.lockedCta')}
                  ctaHref="/#pricing"
                />
              </div>
            )}

            {tier !== 'free' && (
              <>
                {/* Days 2-7 */}
                {weekPlan.length > 0 && (
                  <div className="mt-6">
                    <p className="rp-label mb-2.5">{t('plan.days27')}</p>
                    <ol className="space-y-3.5">
                      {weekPlan.map((w: any, i: number) => (
                        <li key={i} className="flex gap-3 items-start">
                          <span className="rp-pill rp-blue rp-wrap shrink-0 min-w-[5.5rem] justify-center">{w.when}</span>
                          <div>
                            <p className="rp-body font-bold text-charcoal">{w.action}</p>
                            {w.why && <p className="rp-sub">{w.why}</p>}
                            {w.output && (
                              <p className="rp-sub mt-0.5 flex items-start gap-1.5">
                                <span className="text-[color:var(--rp-green)] mt-0.5 shrink-0"><PillIcon name="check" size={15} /></span>
                                <span><span className="font-bold text-charcoal">{t('firstStep.output')}:</span> {w.output}</span>
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* 90-day roadmap */}
                {roadmap.length > 0 && (
                  <div className="mt-6">
                    <p className="rp-label mb-3">{t('plan.next90')}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {roadmap.map(([label, items], colIdx) => (
                        <div key={label} className="rounded-xl border border-[var(--line)] p-3.5">
                          <span className={`rp-pill ${['rp-blue', 'rp-green', 'rp-purple', 'rp-gray'][colIdx % 4]}`}>{label}</span>
                          <ul className="mt-3 space-y-2.5">
                            {(items as string[]).map((item, i) => (
                              <li key={i} className="rp-body text-charcoal/90 flex items-start gap-2">
                                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-teal shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills to build + practice exercise (was inside the AI impact section) */}
                {aiImpact?.focus && (aiImpact.focus.skills_to_build?.length > 0 || aiImpact.focus.exercise?.task) && (
                  <div className="mt-6 rp-note rp-green">
                    <span className="rp-note-label">{t('aiImpact.focusTitle')}</span>
                    <p className="rp-h capitalize text-charcoal mb-2">{aiImpact.focus.title}</p>
                    {aiImpact.focus.skills_to_build?.length > 0 && (
                      <div className="mb-3">
                        <p className="rp-label mb-1">{t('aiImpact.skillsLabel')}</p>
                        <ul className="space-y-1.5">
                          {aiImpact.focus.skills_to_build.map((sk: any, i: number) => (
                            <li key={i} className="rp-body rp-note-text"><span className="font-bold text-charcoal">{sk.skill}</span> — {sk.why}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiImpact.focus.exercise?.task && (
                      <div className="space-y-1.5">
                        <p className="rp-body rp-note-text"><span className="font-bold text-charcoal">{t('aiImpact.exerciseLabel')}:</span> {aiImpact.focus.exercise.task}</p>
                        {aiImpact.focus.exercise.work_sample && (
                          <p className="rp-body rp-note-text"><span className="font-bold text-charcoal">{t('aiImpact.workSampleLabel')}:</span> {aiImpact.focus.exercise.work_sample}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </>),
    careers: (<>
        {/* Suggested Careers */}
        {jobs.length > 0 && (
          <div className="card p-5">
            <SectionHead
              title={t('suggestedCareers.title')}
              subtitle={t('suggestedCareers.subtitle')}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.07A2.25 2.25 0 0118 20.47H6a2.25 2.25 0 01-2.25-2.25v-4.07M15.75 9.75V6a3.75 3.75 0 00-7.5 0v3.75M3.75 9.75h16.5" /></svg>}
            />
            {aiImpact?.overall_summary && (
              <div className="rp-note rp-blue mb-5">
                <span className="rp-note-label">{t('aiImpact.overallLabel')}</span>
                <p className="rp-body rp-note-text">{aiImpact.overall_summary}</p>
              </div>
            )}
            {(() => {
              // One card per recommended career. The top match (index 0 of the full list) is highlighted.
              const renderCareer = (job: any) => {
                const i = jobs.indexOf(job)
                const isNew = job.direction_tag === 'new_direction'
                const rejected = recFeedback[job.title]
                const top = i === 0 && !rejected
                // AI impact for this career (top matches only): the risk pill sits on the card and the detail is a
                // collapsible panel at the bottom of it (the top match starts open).
                const aiCareer: any = aiImpact?.careers?.find((c: any) => normTitle(c.title) === normTitle(job.title))
                const aiRisk: string | undefined = aiCareer?.ai_risk_level
                const aiIsOpen = aiOpen[job.title] ?? (i === 0)
                const hasSteps = Array.isArray(job.next_steps) && job.next_steps.length > 0
                // The plan section shows this career's plan when it was built for it, or (no plan built yet) the top match's.
                const planIsShown = dp ? String(direction?.label || '').toLowerCase() === String(job.title || '').toLowerCase() : i === 0
                return (
                  <div
                    key={job.title}
                    className={`rounded-2xl px-4 py-4 ${
                      top ? 'bg-primary text-white'
                        : `bg-lightblue/40 border border-[var(--line)] border-s-4 ${isNew ? 'border-s-[var(--rp-purple-line)]' : 'border-s-[var(--rp-blue-line)]'}`
                    } ${rejected ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className={`rp-h capitalize ${top ? 'text-white' : 'text-charcoal'}`}>{job.title}</p>
                      {typeof job.match_score === 'number' && (
                        <span className={`rp-pill shrink-0 ${top ? 'rp-ondark' : 'rp-blue'}`}>
                          {job.match_score}% {t('suggestedCareers.matchLabel')}
                        </span>
                      )}
                    </div>
                    {(job.fit_tag || job.direction_tag || aiRisk) && (
                      <div className="flex flex-wrap gap-2 mt-2.5">
                        {job.fit_tag && ['strong_fit', 'worth_exploring'].includes(job.fit_tag) && (
                          <span className={`rp-pill ${top ? 'rp-ondark' : job.fit_tag === 'strong_fit' ? 'rp-green' : 'rp-amber'}`}>
                            <PillIcon name={job.fit_tag === 'strong_fit' ? 'check' : 'search'} />
                            {t(`suggestedCareers.fitTag.${job.fit_tag}`)}
                          </span>
                        )}
                        {job.direction_tag && ['builds_on_background', 'new_direction'].includes(job.direction_tag) && (
                          <span className={`rp-pill ${top ? 'rp-ondark' : job.direction_tag === 'new_direction' ? 'rp-purple' : 'rp-blue'}`}>
                            <PillIcon name={job.direction_tag === 'new_direction' ? 'sparkles' : 'layers'} />
                            {t(`suggestedCareers.directionTag.${job.direction_tag}`)}
                          </span>
                        )}
                        {aiRisk && ['low', 'medium', 'high'].includes(aiRisk) && (
                          <button type="button" title={t('suggestedCareers.aiRiskLink')} onClick={() => { setAiOpen(prev => ({ ...prev, [job.title]: true })); setTimeout(() => document.getElementById(`ai-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60) }} className={`rp-pill ${
                            top ? 'rp-ondark' : aiRisk === 'low' ? 'rp-green' : aiRisk === 'medium' ? 'rp-amber' : 'rp-rose'
                          }`}>
                            <PillIcon name="shield" />
                            {t('aiImpact.riskLabel')}: {levelLabel(aiRisk)}
                          </button>
                        )}
                      </div>
                    )}
                    {job.fit_summary && (
                      <p className={`rp-body mt-3 ${top ? 'text-white/95' : 'text-charcoal/90'}`}>{job.fit_summary}</p>
                    )}
                    {(job.gap || job.next_action || hasSteps) && (
                      <div className={`mt-3 grid grid-cols-1 ${hasSteps ? '' : 'sm:grid-cols-2'} gap-2.5`}>
                        {job.gap && (
                          <div className={`rp-note ${top ? 'rp-ondark-note' : 'rp-amber'}`}>
                            <span className="rp-note-label">{t(isNew ? 'suggestedCareers.gapPaths' : 'suggestedCareers.gapBuild')}</span>
                            <p className={`rp-sub ${top ? 'text-white/95!' : 'rp-note-text'}`}>{job.gap}</p>
                          </div>
                        )}
                        {hasSteps ? (
                          // Students / new graduates: three ordered steps, each with why it matters, replace the single action.
                          <div className={`rp-note ${top ? 'rp-ondark-note' : 'rp-green'}`}>
                            <span className="rp-note-label">{t('suggestedCareers.nextSteps')}</span>
                            <ol className="mt-1 space-y-2">
                              {job.next_steps.slice(0, 3).map((s: any, si: number) => (
                                <li key={si} className={`rp-sub flex gap-2 ${top ? 'text-white/95!' : 'rp-note-text'}`}>
                                  <span className="font-bold shrink-0">{si + 1}.</span>
                                  <span><span className="font-bold">{s.step}</span>{s.why ? <> — {s.why}</> : null}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        ) : job.next_action && (
                          <div className={`rp-note ${top ? 'rp-ondark-note' : 'rp-green'}`}>
                            <span className="rp-note-label">{t('suggestedCareers.nextAction')}</span>
                            <p className={`rp-sub ${top ? 'text-white/95!' : 'rp-note-text'}`}>{job.next_action}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Working people (paid): a full plan for each of the top 3 careers, built when they ask for it. */}
                    {canBuildPlans && i < 3 && !rejected && (
                      <div className="mt-3">
                        {planIsShown ? (
                          <button type="button" onClick={scrollToPlan} className={`text-xs font-semibold underline ${top ? 'text-white' : 'text-primary'}`}>
                            {t('suggestedCareers.planShown')}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={dirBusy}
                            onClick={() => buildCareerPlan(job.title)}
                            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold disabled:opacity-60 ${top ? 'border-white/50 text-white hover:bg-white/10' : 'border-primary text-primary hover:bg-primary/5'}`}
                          >
                            {planBuilding === job.title ? t('suggestedCareers.planBuilding') : t('suggestedCareers.planBuild')}
                          </button>
                        )}
                        {planError && planBuilding === job.title && <p className="mt-1.5 text-xs text-rose-500">{planError}</p>}
                      </div>
                    )}
                    {aiCareer && (
                      <div id={`ai-${i}`} className="mt-3 rounded-xl bg-white border border-[var(--line)] text-charcoal">
                        <button
                          type="button"
                          aria-expanded={aiIsOpen}
                          onClick={() => setAiOpen(prev => ({ ...prev, [job.title]: !aiIsOpen }))}
                          className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-start"
                        >
                          <span className="flex items-center gap-2 rp-body font-bold"><PillIcon name="shield" size={16} />{t('aiImpact.rowTitle')}</span>
                          <span className="flex items-center gap-2">
                            {aiRisk && ['low', 'medium', 'high'].includes(aiRisk) && (
                              <span className={`rp-pill ${aiRisk === 'low' ? 'rp-green' : aiRisk === 'medium' ? 'rp-amber' : 'rp-rose'}`}>{t('aiImpact.riskLabel')}: {levelLabel(aiRisk)}</span>
                            )}
                            <span aria-hidden="true" className={`transition-transform ${aiIsOpen ? 'rotate-180' : ''}`}>▾</span>
                          </span>
                        </button>
                        {aiIsOpen && (
                          <div className="px-3.5 pb-3.5 space-y-3">
                            {aiCareer.at_risk_tasks?.length > 0 && (
                              <div className="rp-note rp-rose">
                                <span className="rp-note-label">{t('aiImpact.atRiskLabel')}</span>
                                <ul className="rp-sub rp-note-text list-disc ps-5 space-y-0.5">
                                  {aiCareer.at_risk_tasks.map((x: string) => <li key={x}>{x}</li>)}
                                </ul>
                              </div>
                            )}
                            {aiCareer.global_evidence && (
                              <p className="rp-sub"><span className="font-bold text-charcoal">{t('aiImpact.globalEvidenceLabel')}:</span> {aiCareer.global_evidence}</p>
                            )}
                            {aiCareer.gcc_outlook && (
                              <p className="rp-sub"><span className="font-bold text-charcoal">{t('aiImpact.localOutlookLabel')}:</span> {aiCareer.gcc_outlook}</p>
                            )}
                            {aiCareer.protected_skills?.length > 0 && (
                              <div>
                                <p className="rp-label mb-1.5">{t('aiImpact.protectedSkillsLabel')}</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {aiCareer.protected_skills.map((sk: string) => <span key={sk} className="rp-pill rp-green rp-wrap">{sk}</span>)}
                                </div>
                              </div>
                            )}
                            {aiCareer.upskilling?.length > 0 && (
                              <div>
                                <p className="rp-label mb-1.5">{t('aiImpact.upskillingLabel')}</p>
                                <ul className="space-y-1">
                                  {aiCareer.upskilling.map((tip: string) => (
                                    <li key={tip} className="rp-sub flex gap-1.5"><span className="text-primary mt-0.5">→</span>{tip}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {aiCareer.what_this_means_for_you && (
                              <div className="rp-note rp-blue">
                                <span className="rp-note-label">{t('aiImpact.whatThisMeansLabel')}</span>
                                <p className="rp-body rp-note-text">{aiCareer.what_this_means_for_you}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {careerCourses(job.title).length > 0 && (
                      <div className="mt-3">
                        <p className="rp-label mb-2" style={top ? { color: 'rgba(255,255,255,.9)' } : undefined}>{t('courses.forThisCareer')}</p>
                        <div className="space-y-2">{careerCourses(job.title).map((c: any) => courseCard(c))}</div>
                      </div>
                    )}
                    <div className={`mt-3 flex flex-wrap items-center gap-2 text-xs ${top ? 'text-white/85' : 'text-charcoal/70'}`}>
                      {rejected ? (
                        <>
                          <span>{t('suggestedCareers.feedback.marked', { reason: t(`suggestedCareers.feedback.${rejected}`) })}</span>
                          <button type="button" onClick={() => undoCareer(job.title)} className="underline">{t('suggestedCareers.feedback.undo')}</button>
                        </>
                      ) : feedbackOpen === job.title ? (
                        <>
                          <span>{t('suggestedCareers.feedback.why')}</span>
                          {['uninterested', 'unqualified', 'unfamiliar', 'impractical'].map(r => (
                            <button key={r} type="button" onClick={() => markCareer(job.title, r)}
                              className={`rounded-full border px-2 py-0.5 ${top ? 'border-white/40 hover:bg-white/10' : 'border-[var(--line-strong)] hover:border-primary hover:text-primary'}`}>
                              {t(`suggestedCareers.feedback.${r}`)}
                            </button>
                          ))}
                          <button type="button" onClick={() => setFeedbackOpen(null)} aria-label={t('suggestedCareers.feedback.cancel')} className="px-1">×</button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setFeedbackOpen(job.title)} className="underline">{t('suggestedCareers.feedback.button')}</button>
                      )}
                    </div>
                  </div>
                )
              }

              // Two groups when every career has a direction tag; a single flat list for high-school users
              // (no field to build on) and for older reports without tags.
              const buildJobs = jobs.filter((j: any) => j.direction_tag === 'builds_on_background')
              const pathJobs = jobs.filter((j: any) => j.direction_tag === 'new_direction')
              const grouped = route !== 'choosing_studies' && buildJobs.length + pathJobs.length === jobs.length
              // Careers the user marked "not for me" sink to the bottom of their list.
              const rejectedLast = (arr: any[]) => [...arr].sort((x, y) => (recFeedback[x.title] ? 1 : 0) - (recFeedback[y.title] ? 1 : 0))
              if (!grouped) return <div className="space-y-2.5">{rejectedLast(jobs).map(renderCareer)}</div>
              const groups = [
                { key: 'build', title: t('suggestedCareers.groupBuild'), subtitle: t('suggestedCareers.groupBuildSub'), items: buildJobs },
                { key: 'paths', title: t('suggestedCareers.groupPaths'), subtitle: t('suggestedCareers.groupPathsSub'), items: pathJobs },
              ]
              if (careerDirection === 'change_field') groups.reverse()
              return (
                <div className="space-y-5">
                  {groups.filter(g => g.items.length > 0).map(g => (
                    <div key={g.key}>
                      <div className="flex items-center gap-2.5 mb-1">
                        <span className={`rp-pill ${g.key === 'paths' ? 'rp-purple' : 'rp-blue'}`}><PillIcon name={g.key === 'paths' ? 'sparkles' : 'layers'} size={15} /></span>
                        <p className="rp-h text-charcoal">{g.title}</p>
                      </div>
                      <p className="rp-sub mb-3">{g.subtitle}</p>
                      <div className="space-y-2.5">{rejectedLast(g.items).map(renderCareer)}</div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        )}

        {/* AI impact deep dive for free users (was under the separate AI section) */}
        {aiImpact && tier === 'free' && (
          !loggedIn ? (
            <BlurGate
              title={t('aiImpact.signupTitle')}
              body={t('aiImpact.signupBody')}
            >
              <div className="card p-5">
                <AiImpactDeepDivePlaceholder />
              </div>
            </BlurGate>
          ) : (
            <LockedSection
              tag={t('aiImpact.lockedTag')}
              title={t('aiImpact.lockedTitle')}
              body={t('aiImpact.lockedBody')}
              ctaLabel={t('aiImpact.lockedCta')}
              ctaHref="/#pricing"
            />
          )
        )}

      </>),
    majors: (<>
        {/* Majors & Exposure — students' practical track, alongside Internships & Exposure above */}
        {studentTrack?.locked && (
          <BlurGate
            title={loggedIn ? t('studentTrack.lockedTitle') : t('studentTrack.signupTitle')}
            body={loggedIn ? t('studentTrack.lockedBody') : t('studentTrack.signupBody')}
            ctaLabel={loggedIn ? t('studentTrack.lockedCta') : undefined}
            ctaHref={loggedIn ? '/#pricing' : undefined}
          >
            <div className="card p-5">
              <SectionHead
                title={t('studentTrack.title')}
                subtitle={t('studentTrack.subtitle')}
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>}
              />
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="border border-[var(--line)] rounded-xl p-3.5">
                    <p className="rp-h text-charcoal">{t('studentTrack.placeholderTitle')}</p>
                    <p className="rp-sub mt-0.5">{t('studentTrack.placeholderBody')}</p>
                  </div>
                ))}
              </div>
            </div>
          </BlurGate>
        )}
        {studentTrack && !studentTrack.locked && (
          <div className="card p-5">
            <SectionHead
              title={t('studentTrack.title')}
              subtitle={t('studentTrack.subtitle')}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443" /></svg>}
            />
            {studentTrack.majors_guidance && (
              <p className="rp-body text-charcoal/85 mb-4">{studentTrack.majors_guidance}</p>
            )}
            {studentTrack.majors?.length > 0 && (
              <div className="space-y-2 mb-4">
                {studentTrack.majors.map((m: any, i: number) => (
                  <div key={i} className="border border-[var(--line)] border-s-4 border-s-teal rounded-xl p-3.5">
                    <p className="rp-h text-charcoal">{m.name}</p>
                    {m.why_fit && <p className="rp-sub mt-0.5">{m.why_fit}</p>}
                    {m.careers?.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="rp-label">{t('studentTrack.leadsTo')}</span>
                        {m.careers.map((c: string) => <span key={c} className="rp-pill rp-blue">{c}</span>)}
                      </div>
                    )}
                    {safeLink(m.link) && (
                      <a href={m.link.url} target="_blank" rel="noopener noreferrer" className="rp-pill rp-blue mt-2.5 no-underline hover:border-primary">
                        {t('studentTrack.findPrograms')} ↗
                      </a>
                    )}
                    {m.try_it && (
                      <div className="rp-note rp-green mt-2.5">
                        <span className="rp-note-label">{t('studentTrack.tryIt')}</span>
                        <p className="rp-sub rp-note-text">{m.try_it}</p>
                      </div>
                    )}
                  </div>
                ))}
                {tier === 'free' && (
                  <p className="rp-sub">{t('studentTrack.lockedMajors')}</p>
                )}
              </div>
            )}
            {studentTrack.exposure_ideas?.length > 0 && (
              <div className="space-y-2">
                {studentTrack.exposure_ideas.map((idea: any, i: number) => (
                  <div key={i} className="border border-[var(--line)] rounded-xl p-3.5">
                    <p className="rp-h text-charcoal">{idea.title}</p>
                    {idea.why && <p className="rp-sub mt-0.5">{idea.why}</p>}
                    {safeLink(idea.link) && (
                      <a href={idea.link.url} target="_blank" rel="noopener noreferrer" className="rp-pill rp-blue mt-2.5 no-underline hover:border-primary">
                        {t(idea.link.kind === 'site' ? 'studentTrack.openSite' : 'studentTrack.findIt')} ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </>),
    path: (<>
        {/* Your Path Forward — "working professionals" practical track */}
        {careerPath?.narrative && (
          <div className="card p-5">
            <SectionHead
              title={t('careerPath.title')}
              subtitle={t(careerPath.path_type === 'progression' ? 'careerPath.subtitleProgression' : careerPath.path_type === 'transition' ? 'careerPath.subtitleTransition' : 'careerPath.subtitleBalanced')}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>}
            />
            <div className="rounded-xl bg-lightblue/60 border-l-4 border-primary px-4 py-3.5 mb-4">
              <p className="rp-body text-charcoal/90">{careerPath.narrative}</p>
            </div>
            {careerPath.next_steps?.length > 0 && (
              <div className="space-y-2">
                {careerPath.next_steps.map((step: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 rp-body text-charcoal/85 border border-[var(--line)] rounded-xl p-3 hover:border-primary/30 hover:bg-lightblue/30 transition-colors">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--rp-blue-bg)] text-[color:var(--rp-blue)] text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </>),
    jobs: (<>
        {/* Live Job Postings (or Internships & Exposure for still-enrolled students) */}
        {jobListings.length > 0 && (
          <>
          {tier !== 'free' ? (
            <div className="card p-5">
              <SectionHead
                title={t(listingsAsInternships ? 'internships.title' : 'liveJobs.title')}
                subtitle={t(listingsAsInternships ? 'internships.subtitle' : 'liveJobs.subtitle')}
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>}
              />
              {saveError && <p className="text-xs text-rose-500 mb-2">{saveError}</p>}
              <div className="space-y-2">
                {jobListings.map((job: any, i: number) => (
                  <div key={i} className="flex items-start justify-between gap-3 border border-[var(--line)] rounded-xl p-3.5 hover:border-[var(--line-strong)] hover:bg-lightblue/50 transition-colors">
                    <a href={job.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 group">
                      <p className="rp-h text-charcoal group-hover:text-primary truncate">{job.title}</p>
                      <p className="rp-sub truncate">{job.company} · {job.location}</p>
                      <p className="rp-sub mt-0.5">
                        {t('liveJobs.for')}: {job.matched_career}
                      </p>
                      {((job.is_internship && !listingsAsInternships) || postedLabel(job.posted_at) || requiresLabel(job)) && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {job.is_internship && !listingsAsInternships && <span className="rp-pill rp-purple">{t('liveJobs.internshipTag')}</span>}
                          {postedLabel(job.posted_at) && <span className="rp-pill rp-gray">{t('liveJobs.posted', { when: postedLabel(job.posted_at) as string })}</span>}
                          {requiresLabel(job) && <span className="rp-pill rp-blue rp-wrap">{t('liveJobs.requires')}: {requiresLabel(job)}</span>}
                        </div>
                      )}
                    </a>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="rp-pill rp-gray">{job.source}</span>
                      <button
                        onClick={() => saveJob(job, i)}
                        disabled={savedJobs.has(i)}
                        className={`rp-pill ${savedJobs.has(i) ? 'rp-green' : 'rp-onblue hover:border-primary'}`}
                      >
                        {savedJobs.has(i) ? t('liveJobs.saved') : t('liveJobs.save')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : !loggedIn ? (
            <BlurGate
              title={t(listingsAsInternships ? 'internships.signupTitle' : 'liveJobs.signupTitle')}
              body={t(listingsAsInternships ? 'internships.signupBody' : 'liveJobs.signupBody')}
            >
              <div className="card p-5">
                <SectionHead
                  title={t(listingsAsInternships ? 'internships.title' : 'liveJobs.title')}
                  subtitle={t(listingsAsInternships ? 'internships.subtitle' : 'liveJobs.subtitle')}
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>}
                />
                <div className="space-y-2">
                  {jobListings.map((job: any, i: number) => (
                    <div key={i} className="flex items-start justify-between gap-3 border border-[var(--line)] rounded-xl p-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="rp-h text-charcoal truncate">{job.title}</p>
                        <p className="rp-sub truncate">{job.company} · {job.location}</p>
                      </div>
                      <span className="rp-pill rp-gray">{job.source}</span>
                    </div>
                  ))}
                </div>
              </div>
            </BlurGate>
          ) : (
            <LockedSection
              tag={t('liveJobs.lockedTag')}
              title={t(listingsAsInternships ? 'internships.lockedTitle' : 'liveJobs.lockedTitle')}
              body={t(listingsAsInternships ? 'internships.lockedBody' : 'liveJobs.lockedBody')}
              ctaLabel={t('liveJobs.lockedCta')}
              ctaHref="/#pricing"
            />
          )}
          </>
        )}

      </>),
    certs: (<>
        {/* Certifications are paid: free users on the degree-to-career route see an unlock card */}
        {tier === 'free' && route === 'degree_to_career' && !certifications?.certifications?.length && (
          <LockedSection
            tag={t('certifications.lockedTag')}
            title={t('certifications.lockedTitle')}
            body={t('certifications.lockedBody')}
            ctaLabel={t('certifications.lockedCta')}
            ctaHref="/#pricing"
          />
        )}

        {/* Certifications to Pursue — "entering the market" practical track */}
        {certifications?.certifications?.length > 0 && (
          <div className="card p-5">
            <SectionHead
              title={t('certifications.title')}
              subtitle={t('certifications.subtitle')}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>}
            />
            <div className="space-y-2">
              {certifications.certifications.map((cert: any, i: number) => (
                <div key={i}>
                  {/* Grouped by the career each certification is for (reports saved before this have no career) */}
                  {cert.for_career && cert.for_career !== certifications.certifications[i - 1]?.for_career && (
                    <p className={`rp-label ${i > 0 ? 'mt-4' : ''} mb-2`}>{t('courses.forCareer', { career: cert.for_career })}</p>
                  )}
                  <div className="border border-[var(--line)] rounded-xl p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="rp-h text-charcoal">{cert.title}</p>
                      {cert.provider_type && <span className="rp-pill rp-gray">{cert.provider_type}</span>}
                    </div>
                    {cert.about && (
                      <p className="rp-sub mt-1.5"><span className="font-bold text-charcoal">{t('courses.about')}:</span> {cert.about}</p>
                    )}
                    {cert.why && (
                      cert.for_career
                        ? <p className="rp-sub mt-1"><span className="font-bold text-charcoal">{t('courses.why')}:</span> {cert.why}</p>
                        : <p className="rp-sub mt-0.5">{cert.why}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </>),
    courses: (<>
        {/* Course Recommendations */}
        {coursesMerged ? null : courses.length > 0 ? (
          <div className="card p-5">
            <SectionHead
              title={t('courses.title')}
              subtitle={t('courses.subtitle')}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>}
            />
            <div className="space-y-2">
              {orphanCourses.map((course: any, ci: number) => (
                <div key={course.id}>
                  {/* Courses come grouped by the career they are for */}
                  {course.for_career && course.for_career !== orphanCourses[ci - 1]?.for_career && (
                    <p className={`rp-label ${ci > 0 ? 'mt-4' : ''} mb-2`}>{t('courses.forCareer', { career: course.for_career })}</p>
                  )}
                  <a
                    href={course.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block border border-[var(--line)] rounded-xl p-3.5 hover:border-[var(--line-strong)] hover:bg-lightblue/50 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="rp-h text-charcoal group-hover:text-primary">{course.title}</p>
                        <p className="rp-sub">{course.provider} · {course.level}{course.duration_hours ? ` · ${course.duration_hours}h` : ''}</p>
                      </div>
                      <span className={`rp-pill shrink-0 mt-0.5 ${course.is_free ? 'rp-green' : 'rp-blue'}`}>
                        {course.is_free ? t('courses.free') : t('courses.paid')}
                      </span>
                    </div>
                    {course.about && (
                      <p className="rp-sub mt-2"><span className="font-bold text-charcoal">{t('courses.about')}:</span> {course.about}</p>
                    )}
                    {course.why && (
                      <p className="rp-sub mt-1"><span className="font-bold text-charcoal">{t('courses.why')}:</span> {course.why}</p>
                    )}
                  </a>
                </div>
              ))}
            </div>
          </div>
        ) : tier === 'free' && !loggedIn ? (
          <BlurGate
            title={t('courses.signupTitle')}
            body={t('courses.signupBody')}
          >
            <div className="card p-5">
              <SectionHead
                title={t('courses.title')}
                subtitle={t('courses.subtitle')}
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>}
              />
              <CoursesPlaceholder />
            </div>
          </BlurGate>
        ) : tier === 'free' ? (
          <LockedSection
            tag={t('courses.lockedTag')}
            title={t('courses.lockedTitle')}
            body={t('courses.lockedBody')}
            ctaLabel={t('courses.lockedCta')}
            ctaHref="/#pricing"
          />
        ) : coursesError ? (
          <div className="card p-5 text-center">
            <p className="text-sm text-charcoal/70 mb-2">{t('error.coursesLoadFailed')}</p>
            <button onClick={retry} className="text-sm text-primary hover:underline font-medium">{t('error.tryAgain')}</button>
          </div>
        ) : null}

      </>),
    companies: (<>
        {/* Company Target List */}
        {companies.length > 0 ? (
          <div className="card p-5">
            <SectionHead
              title={t('companies.title')}
              subtitle={t('companies.subtitle')}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {companies.map((company: any) => (
                <a
                  key={company.id}
                  href={company.career_page_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 border border-[var(--line)] rounded-xl p-3 hover:border-[var(--line-strong)] hover:bg-lightblue/50 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="rp-h text-charcoal group-hover:text-primary truncate">{company.name_en}</p>
                    <p className="rp-sub truncate">{company.sector}{company.is_government ? ` · ${t('companies.government')}` : ''}</p>
                  </div>
                  <span className="rp-pill rp-blue">{t('companies.view')}</span>
                </a>
              ))}
            </div>
          </div>
        ) : tier === 'free' && !loggedIn && !isStillEnrolled ? (
          <BlurGate
            title={t('companies.signupTitle')}
            body={t('companies.signupBody')}
          >
            <div className="card p-5">
              <SectionHead
                title={t('companies.title')}
                subtitle={t('companies.subtitle')}
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>}
              />
              <CompaniesPlaceholder />
            </div>
          </BlurGate>
        ) : tier === 'free' && !isStillEnrolled ? (
          <LockedSection
            tag={t('companies.lockedTag')}
            title={t('companies.lockedTitle')}
            body={t('companies.lockedBody')}
            ctaLabel={t('companies.lockedCta')}
            ctaHref="/#pricing"
          />
        ) : companiesError ? (
          <div className="card p-5 text-center">
            <p className="text-sm text-charcoal/70 mb-2">{t('error.companiesLoadFailed')}</p>
            <button onClick={retry} className="text-sm text-primary hover:underline font-medium">{t('error.tryAgain')}</button>
          </div>
        ) : null}

      </>),
    ai: (<>
        {/* AI Impact */}
        {aiImpact ? (
          <>
          <div className="card p-5" id="ai-impact">
            <SectionHead
              title={t('aiImpact.title')}
              subtitle={t('aiImpact.subtitle')}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 001.357 2.059l.096.04a2.25 2.25 0 002.635-.701L19.5 9m-9.75-5.896A24.27 24.27 0 0112 3c.607 0 1.207.026 1.8.078" /></svg>}
            />
            <p className="rp-body text-charcoal/85 mb-4">{aiImpact.overall_summary}</p>
            <div className="space-y-3">
              {aiImpact.careers?.map((c: any) => (
                <div key={c.title} className="border border-[var(--line)] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="rp-h text-charcoal">{c.title}</span>
                    <span className={`rp-pill ${
                      c.ai_risk_level === 'low' ? 'rp-green' :
                      c.ai_risk_level === 'medium' ? 'rp-amber' :
                      'rp-rose'
                    }`}>
                      <PillIcon name="shield" />
                      {t('aiImpact.riskLabel')}: {c.ai_risk_level ? levelLabel(c.ai_risk_level) : ''}
                    </span>
                  </div>
                  {c.global_evidence && (
                    <p className="rp-sub mb-1.5"><span className="font-bold text-charcoal">{t('aiImpact.globalEvidenceLabel')}:</span> {c.global_evidence}</p>
                  )}
                  <p className="rp-sub mb-3">
                    {c.global_evidence && <span className="font-bold text-charcoal">{t('aiImpact.localOutlookLabel')}: </span>}
                    {c.gcc_outlook}
                  </p>
                  {c.protected_skills?.length > 0 && (
                    <div className="mb-3">
                      <p className="rp-label mb-1.5">{t('aiImpact.protectedSkillsLabel')}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {c.protected_skills.map((s: string) => (
                          <span key={s} className="rp-pill rp-green rp-wrap">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {c.upskilling?.length > 0 && (
                    <div>
                      <p className="rp-label mb-1.5">{t('aiImpact.upskillingLabel')}</p>
                      <ul className="space-y-1">
                        {c.upskilling.map((tip: string) => (
                          <li key={tip} className="rp-sub flex gap-1.5">
                            <span className="text-primary mt-0.5">→</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {c.what_this_means_for_you && (
                    <div className="rp-note rp-blue mt-3">
                      <span className="rp-note-label">{t('aiImpact.whatThisMeansLabel')}</span>
                      <p className="rp-body rp-note-text">{c.what_this_means_for_you}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          {tier === 'free' && !loggedIn ? (
            <BlurGate
              title={t('aiImpact.signupTitle')}
              body={t('aiImpact.signupBody')}
            >
              <div className="card p-5">
                <AiImpactDeepDivePlaceholder />
              </div>
            </BlurGate>
          ) : tier === 'free' ? (
            <LockedSection
              tag={t('aiImpact.lockedTag')}
              title={t('aiImpact.lockedTitle')}
              body={t('aiImpact.lockedBody')}
              ctaLabel={t('aiImpact.lockedCta')}
              ctaHref="/#pricing"
            />
          ) : null}
          </>
        ) : null}

      </>),
    profile: (<>
        {/* Career Types + Values + Strengths + Personality */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Career Types */}
          <div className="card p-5">
            <SectionHead
              title={t('careerTypes.title')}
              subtitle={t('careerTypes.subtitle')}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.07A2.25 2.25 0 0118 20.47H6a2.25 2.25 0 01-2.25-2.25v-4.07M15.75 9.75V6a3.75 3.75 0 00-7.5 0v3.75M3.75 9.75h16.5" /></svg>}
            />
            {/* All six types, same look, highest first, each with its percentage (no single "main" type) */}
            <div className="space-y-2.5">
              {['realistic', 'investigative', 'artistic', 'social', 'enterprising', 'conventional']
                .filter(rt => scoreMap[rt] !== undefined)
                .sort((a, b) => scoreMap[b] - scoreMap[a])
                .map(rt => scoreRow(riasecLabel(rt), scoreMap[rt]))}
              {Object.keys(scoreMap).length === 0 && (
                <div className="flex gap-2 flex-wrap">
                  {summary.riasec.top_types.map((rt: string) => <span key={rt} className="chip">{riasecLabel(rt)}</span>)}
                </div>
              )}
            </div>
          </div>

          {/* Core Values */}
          <div className="card p-5">
            <SectionHead
              title={t('coreValues.title')}
              subtitle={t('coreValues.subtitle')}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>}
            />
            <div className="space-y-2.5">
              {summary.values.top_values.map((v: string) => scoreMap[v] !== undefined
                ? scoreRow(valueLabel(v), scoreMap[v])
                : <span key={v} className="chip">{valueLabel(v)}</span>)}
            </div>
          </div>

          {/* Top Strengths */}
          <div className="card p-5">
            <SectionHead
              title={t('topStrengths.title')}
              subtitle={t('topStrengths.subtitle')}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>}
            />
            <div className="space-y-2.5">
              {summary.strengths.top_strengths.map((st: string) => scoreMap[st] !== undefined
                ? scoreRow(strengthLabel(st), scoreMap[st])
                : <span key={st} className="chip">{strengthLabel(st)}</span>)}
            </div>
          </div>

          {/* Personality */}
          <div className="card p-5">
            <SectionHead
              title={t('personality.title')}
              subtitle={t('personality.subtitle')}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>}
            />
            <div className="space-y-2.5">
              {Object.entries(summary.big_five).map(([trait, level]: any) => (
                <div key={trait}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="rp-sub font-medium">{traitLabel(trait)}</span>
                    <span className="rp-pill rp-blue">{levelLabel(level)}</span>
                  </div>
                  <div className="w-full bg-lightblue rounded-full h-1.5">
                    <div className="bg-primary h-1.5 rounded-full transition-all duration-700" style={{ width: levelToWidth[level] ?? '50%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Work Style & Resilience */}
        {summary.work_style && (
          <div className="card p-5">
            <SectionHead
              title={t('workStyle.title')}
              subtitle={t('workStyle.subtitle')}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>}
            />
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
              {[
                { label: t('workStyle.pace'), low: t('workStyle.steady'), high: t('workStyle.fastPaced'), score: summary.work_style.pace },
                { label: t('workStyle.environment'), low: t('workStyle.largeOrg'), high: t('workStyle.startup'), score: summary.work_style.environment },
                { label: t('workStyle.sector'), low: t('workStyle.public'), high: t('workStyle.private'), score: summary.work_style.sector },
                { label: t('workStyle.mobility'), low: t('workStyle.local'), high: t('workStyle.openToRelocate'), score: summary.work_style.mobility },
                ...(summary.resilience ? [
                  { label: t('workStyle.longTermFocus'), low: t('workStyle.shortTerm'), high: t('workStyle.longTerm'), score: summary.resilience.long_term_focus },
                  { label: t('workStyle.resilience'), low: t('workStyle.needsSupport'), high: t('workStyle.bouncesBack'), score: summary.resilience.workplace_resilience },
                ] : []),
              ].map(({ label, low, high, score }) => (
                <div key={label}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="rp-sub font-medium">{label}</span>
                    <span className={`rp-pill ${score >= 50 ? 'rp-blue' : 'rp-gray'}`}>{score >= 50 ? high : low}</span>
                  </div>
                  <div className="w-full bg-lightblue rounded-full h-1.5">
                    <div className="bg-teal h-1.5 rounded-full transition-all duration-700" style={{ width: `${score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </>),
  }
  const DEFAULT_ORDER = ['summary', 'careers', 'plan', 'jobs', 'courses', 'ai', 'profile']
  const knownKeys = Object.keys(sectionBlocks)
  const baseOrder = (sectionOrder && sectionOrder.length ? sectionOrder : DEFAULT_ORDER).filter(k => knownKeys.includes(k))
  // 'ai' is merged into the careers section (a collapsible panel on each career); the PDF still has its own AI page.
  const MERGED_SECTIONS = ['ai']
  const orderedKeys = [...baseOrder, ...knownKeys.filter(k => !baseOrder.includes(k))].filter(k => !MERGED_SECTIONS.includes(k))

  return (
    <div className="min-h-screen brand-surface page-fade-in">

      {/* Hero */}
      <div className="brand-hero px-4 pt-10 pb-16 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-4 left-8 w-32 h-32 rounded-full bg-white" />
          <div className="absolute bottom-0 right-4 w-48 h-48 rounded-full bg-teal" />
        </div>
        <div className="relative">
          <div className="flex justify-center mb-5"><Logomark size={44} tone="dark" glow /></div>
          <p className="eyebrow !text-white/70 mb-3">{t('hero.eyebrow')}</p>
          <h1 className="text-3xl font-extrabold mb-2">{t('hero.title')}</h1>
          <p className="text-white/70 text-sm mb-6 max-w-xs mx-auto">{t('hero.subtitle')}</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span className="inline-block bg-white/15 border border-white/25 backdrop-blur-sm text-white px-5 py-2 rounded-full text-sm font-semibold">
              {t('hero.typeLabel', { type: riasecLabel(topType) })}
            </span>
            <span className="inline-block bg-white/15 border border-white/25 backdrop-blur-sm text-white px-5 py-2 rounded-full text-sm font-semibold">
              {t('hero.riasecCode', { code: riasecCode })}
            </span>
          </div>
          <div className="flex flex-col items-center gap-2 mt-6">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => downloadReport()}
                disabled={downloadingReport}
                className="inline-flex items-center gap-2 bg-white text-primary px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                {downloadingReport ? t('hero.downloading') : t('hero.downloadPdf')}
              </button>
              {!arabicOnly && <button
                onClick={() => downloadReport(reportLocale === 'ar' ? 'en' : 'ar')}
                disabled={downloadingReport}
                className="inline-flex items-center gap-2 bg-white/10 border border-white/25 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                {downloadingReport
                  ? t('hero.downloading')
                  : reportLocale === 'ar' ? t('hero.downloadEnglish') : t('hero.downloadArabic')}
              </button>}
            </div>
            {downloadError && <p className="text-rose-200 text-xs">{downloadError}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 mt-8 pb-16 space-y-4 relative z-10">

        {/* Signup CTA */}
        {!loggedIn && (
          <div className="card p-5 flex items-center justify-between gap-4 flex-wrap border-l-4 border-l-teal">
            <div>
              <p className="rp-h text-charcoal">{t('signup.title')}</p>
              <p className="rp-sub mt-0.5">{t('signup.subtitle')}</p>
            </div>
            <Link
              href={{ pathname: '/signup', query: email ? { email } : {} }}
              className="cta shrink-0"
              style={{ padding: '10px 18px', fontSize: 14, borderRadius: 12 }}
            >
              {t('signup.cta')}
            </Link>
          </div>
        )}

        {/* Every section can be folded away; all start open. A section with nothing to show hides its bar too. */}
        <div className="flex justify-end gap-3 text-xs text-charcoal/70">
          <button type="button" className="underline" onClick={() => setCollapsedSections({})}>{t('sections.expandAll')}</button>
          <button type="button" className="underline" onClick={() => setCollapsedSections(Object.fromEntries(orderedKeys.map(k => [k, true])))}>{t('sections.collapseAll')}</button>
        </div>
        {orderedKeys.map(k => {
          const closed = !!collapsedSections[k]
          const barTitle =
            k === 'summary' ? t('sections.summary')
            : k === 'profile' ? t('sections.profile')
            : k === 'careers' ? t('suggestedCareers.title')
            : k === 'plan' ? t('plan.title')
            : k === 'majors' ? t('studentTrack.title')
            : k === 'path' ? t('careerPath.title')
            : k === 'jobs' ? t(listingsAsInternships ? 'internships.title' : 'liveJobs.title')
            : k === 'certs' ? t('certifications.title')
            : k === 'courses' ? t('courses.title')
            : k === 'companies' ? t('companies.title')
            : ''
          return (
            <div key={k} className="report-section space-y-4">
              <button
                type="button"
                aria-expanded={!closed}
                aria-controls={`section-${k}`}
                onClick={() => setCollapsedSections(prev => ({ ...prev, [k]: !closed }))}
                className="report-section-bar w-full flex items-center justify-between gap-3 rounded-xl bg-white/70 border border-[var(--line)] px-4 py-2.5 text-start"
              >
                <span className="rp-h text-charcoal">{barTitle}</span>
                <span aria-hidden="true" className={`transition-transform ${closed ? '' : 'rotate-180'}`}>▾</span>
              </button>
              <div id={`section-${k}`} className="report-section-body space-y-4" hidden={closed}>
                <Fragment>{sectionBlocks[k]}</Fragment>
              </div>
            </div>
          )
        })}

        {/* Reassess */}
        {/*
        <div className="flex flex-col items-center gap-2 pt-4">
          <button
            onClick={reassess}
            disabled={reassessing}
            className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full border border-[var(--line-strong)] text-charcoal/70 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
          >
            <svg className={`w-3.5 h-3.5 ${reassessing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            {reassessing ? 'Refreshing…' : 'Refresh AI impact & job data'}
          </button>
          <p className="text-xs text-charcoal/70">Pulls the latest market data — your personality profile stays the same</p>
          {reassessError && <p className="text-xs text-rose-500">{reassessError}</p>}
        </div>
        */}

        {/* Share */}
        <div className="flex flex-col items-center gap-2 pt-2 pb-4">
          <p className="text-sm text-charcoal/70">{t('share')}</p>
          <CopyLinkButton />
        </div>

        {/* Result Stage feedback — non-blocking, at the end of the report (moved from the top 1 Oct 2026); shows on every visit until answered */}
        {!COACH_FEEDBACK && (
          <BetaFeedbackResultStage responseId={id} locale={locale} initiallyDone={resultStageDone} />
        )}
        <div ref={feedbackAnchorRef} aria-hidden="true" style={{ height: 1 }} />

      </div>
      {/* <CoachBubble locale={locale as 'en' | 'ar'} message={coachMsg} onDismiss={dismissCoach} autoHideMs={14000} /> */}
      <CoachWidget
        locale={locale as 'en' | 'ar'} mode="results" responseId={id}
        tip={coachMsg} onTipDismiss={dismissCoach} tipAutoHideMs={14000}
        feedback={COACH_FEEDBACK && !resultStageDone && !resultMarker && !resultFeedbackDone ? {
          kind: 'result', responseId: id, autoOpen: resultFeedbackReached,
          nudge: resultFeedbackReached ? COACH_NUDGE_RESULT : undefined,
          onDone: () => setResultFeedbackDone(true),
        } : undefined}
      />
    </div>
  )
}
