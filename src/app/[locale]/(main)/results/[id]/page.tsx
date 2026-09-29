'use client'

import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { useParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { apiGet, apiAuthGet, apiAuthPost, apiAuthDelete, apiAuthGetBlob } from '@/lib/api'
import { CopyLinkButton } from '@/components/CopyLinkButton'
import { Link } from '@/i18n/navigation'
import { supabase } from '@/lib/supabase'
import Logomark from '@/components/brand/Logomark'
import Constellation from '@/components/brand/Constellation'
import { LockedSection } from '@/components/shared/LockedSection'
import { BlurGate } from '@/components/shared/BlurGate'
import BetaFeedbackStage1 from '@/components/beta-feedback/BetaFeedbackStage1'
import BreakPanel from '@/components/BreakPanel'
import BetaFeedbackResultStage from '@/components/beta-feedback/BetaFeedbackResultStage'

const levelToWidth: Record<string, string> = {
  low: '20%',
  'low-moderate': '38%',
  moderate: '52%',
  'moderate-high': '68%',
  high: '88%',
}

// Brand section header (teal icon tile + title/subtitle) used across the report.
function SectionHead({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl bg-lightblue flex items-center justify-center shrink-0 text-primary">
        {icon}
      </div>
      <div>
        <h3 className="font-bold text-charcoal text-sm">{title}</h3>
        <p className="text-xs text-charcoal/45">{subtitle}</p>
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
            <p className="text-sm font-bold text-charcoal truncate">{t('placeholderTitle')}</p>
            <p className="text-xs text-charcoal/50 truncate">{t('placeholderMeta')}</p>
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
            <p className="text-sm font-bold text-charcoal truncate">{t('placeholderName')}</p>
            <p className="text-xs text-charcoal/50 truncate">{t('placeholderSector')}</p>
          </div>
          <span className="chip !py-0.5 !text-[11px]">{t('view')}</span>
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
            <span className="text-sm font-bold text-charcoal">{t('placeholderTitle')}</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal/10 text-teal">{t('placeholderRisk')}</span>
          </div>
          <p className="text-xs text-charcoal/50 mb-2">{t('placeholderOutlook')}</p>
          <div className="flex flex-wrap gap-1.5">
            <span className="chip chip-teal !py-0.5 !text-[11px]">{t('placeholderSkill')}</span>
            <span className="chip chip-teal !py-0.5 !text-[11px]">{t('placeholderSkill')}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

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
  const [recentCompletions, setRecentCompletions] = useState<number | null>(null)
  const [tier, setTier] = useState<'free' | 'pathfinder' | 'launchpad'>('launchpad')
  const [betaMode, setBetaMode] = useState(false)
  const [stage1Done, setStage1Done] = useState(false)
  const [resultStageDone, setResultStageDone] = useState(false)
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
  const dirPolls = useRef(0)
  // Careers the user marked "not for me": career title -> reason. Feedback only, it never changes scores.
  const [recFeedback, setRecFeedback] = useState<Record<string, string>>({})
  const [feedbackOpen, setFeedbackOpen] = useState<string | null>(null)
  const [dirError, setDirError] = useState('')
  const [jobsSuggestionsLoading, setJobsSuggestionsLoading] = useState(true)
  const [aiImpact, setAiImpact] = useState<any>(null)
  const [jobListings, setJobListings] = useState<any[]>([])
  const [isStillEnrolled, setIsStillEnrolled] = useState(false)
  const [route, setRoute] = useState<string>('')
  const [sectionOrder, setSectionOrder] = useState<string[] | null>(null)
  const [careerDirection, setCareerDirection] = useState<string | null>(null)
  const [studentTrack, setStudentTrack] = useState<any>(null)
  const [certifications, setCertifications] = useState<any>(null)
  const [careerPath, setCareerPath] = useState<any>(null)
  const [aiLoading, setAiLoading] = useState(true)
  const [jobsLoading, setJobsLoading] = useState(true)
  const [companies, setCompanies] = useState<any[]>([])
  const [companiesLoading, setCompaniesLoading] = useState(true)
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
  const [retryKey, setRetryKey] = useState(0)

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
          setEmail(data.email || '')
          if (data.tier === 'free' || data.tier === 'pathfinder' || data.tier === 'launchpad') setTier(data.tier)
          setIsStillEnrolled(!!data.is_still_enrolled)
          if (typeof data.route === 'string') setRoute(data.route)
          if (Array.isArray(data.section_order)) setSectionOrder(data.section_order)
          if (data.locale === 'ar' || data.locale === 'en') setReportLocale(data.locale)
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
        .then(data => { if (data && (data.majors_guidance || data.exposure_ideas?.length)) setStudentTrack(data) })
        .catch(() => {})
      apiAuthGet<any>(`/assessment/${id}/certifications?locale=${locale}`)
        .then(data => { if (data?.certifications?.length) setCertifications(data) })
        .catch(() => {})
      apiAuthGet<any>(`/assessment/${id}/career-path?locale=${locale}`)
        .then(data => { if (data && data.narrative) setCareerPath(data) })
        .catch(() => {})
      apiAuthGet<any[]>(`/assessment/${id}/companies`)
        .then(data => { setCompanies(data || []); setCompaniesError(false) })
        .catch(() => setCompaniesError(true))
        .finally(() => setCompaniesLoading(false))
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


  if (error) {
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
  const awaitingStage1 = betaMode && justCompleted && !stage1Done

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

  // When a direction has been chosen (paid), its first step and 7-day plan replace the generic ones; the
  // months roadmap (actionPlan.month_*) is unchanged.
  const shownPlan = direction?.plan && tier !== 'free'
    ? { ...(actionPlan || {}), first_step: direction.plan.first_step, week_plan: direction.plan.week_plan }
    : actionPlan

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

  // Poll while the server builds the plan (up to ~2 minutes), then give up quietly.
  useEffect(() => {
    if (dirPending === null) { dirPolls.current = 0; return }
    if (dirPolls.current >= 24) { setDirFailed(dirPending); setDirPending(null); return }
    const timer = setTimeout(() => {
      dirPolls.current += 1
      apiAuthGet<any>(`/assessment/${id}/direction?locale=${locale}`).then(applyDirection).catch(() => {})
    }, 5000)
    return () => clearTimeout(timer)
  }, [dirPending, dirTick, id, locale])

  async function buildDirection(label: string, source: 'suggested' | 'user') {
    setDirBusy(true)
    setDirError('')
    try {
      const r = await apiAuthPost<any>(`/assessment/${id}/direction`, { label, source, locale })
      setDirection(r?.selected || null)
      setDirPicking(false)
      setDirTyped('')
    } catch (e: any) {
      setDirError(e?.message || t('direction.error'))
    } finally {
      setDirBusy(false)
    }
  }

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
      { done: !companiesLoading, label: t('loading.stages.companies') },
      { done: !coursesLoading, label: t('loading.stages.courses') },
    ]
    const completedCount = stages.filter(s => s.done).length
    // Mirrors AssessmentForm's litCount math (progress -> 8 constellation nodes),
    // so the results-page loader reads as a continuation of the same animation.
    const litCount = Math.max(1, Math.round((completedCount / stages.length) * 7) + 1)
    const showFeedbackCol = betaMode && justCompleted
    return (
      <div className="min-h-screen brand-hero flex items-center justify-center px-6 py-10">
        <div className="report-loading-grid">
          <div className="report-loading-col report-loading-left">
            <div className="report-loading-logo inline-flex"><Logomark size={44} tone="dark" glow /></div>
            {reportReadyButAwaitingFeedback ? (
              <p className="text-white/80 text-xl font-semibold">{t('loading.readyAwaitingFeedback')}</p>
            ) : (
              <>
                <p className="text-white/80 text-xl font-semibold">{t('loading.preparing')}</p>
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
                  <p className="text-teal text-sm font-medium">✦ {t('loading.recentCompletions', { count: recentCompletions })}</p>
                )}
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
              <BetaFeedbackStage1 responseId={id} locale={locale} onComplete={() => setStage1Done(true)} />
            </div>
          )}
        </div>
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
  const sectionBlocks: Record<string, ReactNode> = {
    summary: (<>
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
        {dirLoaded && tier !== 'free' && (direction || dirPending !== null || dirFailed) && (
            <div className="card p-5 border-s-4 border-s-primary">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="eyebrow mb-1">{t('direction.yourDirection')}</p>
                  <p className="text-base font-extrabold text-charcoal capitalize">{direction?.label || dirPending || dirFailed}</p>
                </div>
                {direction && (
                  <div className="flex items-center gap-2">
                    <span className="chip !py-0.5 !text-[11px]">{direction.source === 'user' ? t('direction.badgeYours') : t('direction.badgeSuggested')}</span>
                    {/* "Change direction" is off while the direction comes from the assessment answer:
                    <button type="button" onClick={() => { setDirPicking(true); setDirError('') }} className="text-xs text-primary underline">{t('direction.change')}</button> */}
                  </div>
                )}
              </div>
              {!direction?.plan ? (
                dirFailed ? (
                  <p className="mt-3 text-xs text-charcoal/60">{t('direction.failed')}</p>
                ) : (
                  <p className="mt-3 text-xs text-charcoal/60">{t('direction.building')}</p>
                )
              ) : (
                <div className="mt-3 space-y-3 text-xs leading-relaxed text-charcoal/70">
                  {direction.plan.fit_note && <p>{direction.plan.fit_note}</p>}
                  {direction.plan.gap && <p><span className="font-bold text-charcoal">{t('direction.gap')}:</span> {direction.plan.gap}</p>}
                  {direction.plan.steps_to_reach?.length > 0 && (
                    <div>
                      <p className="font-bold text-charcoal mb-1">{t('direction.steps')}</p>
                      <ol className="list-decimal ps-4 space-y-1">
                        {direction.plan.steps_to_reach.map((st: string, i: number) => <li key={i}>{st}</li>)}
                      </ol>
                    </div>
                  )}
                  {direction.plan.skills_to_build?.length > 0 && (
                    <div>
                      <p className="font-bold text-charcoal mb-1">{t('direction.skills')}</p>
                      <ul className="space-y-1">
                        {direction.plan.skills_to_build.map((sk: any, i: number) => <li key={i}><span className="font-bold text-charcoal">{sk.skill}</span> — {sk.why}</li>)}
                      </ul>
                    </div>
                  )}
                  {direction.plan.exercise?.task && (
                    <p><span className="font-bold text-charcoal">{t('direction.exercise')}:</span> {direction.plan.exercise.task}
                      {direction.plan.exercise.work_sample && <> <span className="font-bold text-charcoal">{t('direction.workSample')}:</span> {direction.plan.exercise.work_sample}</>}
                    </p>
                  )}
                  {direction.plan.reality_check && <p className="text-charcoal/50">{direction.plan.reality_check}</p>}
                  <p className="text-charcoal/50">{t('direction.scoresNote')}</p>
                </div>
              )}
            </div>
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
                <label className="text-xs font-semibold text-charcoal/60">{t('direction.typeLabel')}</label>
                <input
                  type="text"
                  value={dirTyped}
                  maxLength={80}
                  onChange={e => setDirTyped(e.target.value)}
                  placeholder={t('direction.typePlaceholder')}
                  className="mt-1 w-full rounded-xl border border-[var(--line-strong)] px-3 py-2 text-sm"
                />
                <p className="text-[11px] text-charcoal/50 mt-1">{t('direction.typeHint')}</p>
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
                  <button type="button" onClick={() => setDirPicking(false)} className="text-xs text-charcoal/60 underline">{t('direction.cancel')}</button>
                )}
              </div>
            </div>
        )}
        */}

        {/* First step this week + 7-day plan (paid) */}
        {shownPlan?.first_step?.action && (
          <div className="card p-5 border-s-4 border-s-teal">
            <SectionHead
              title={t('firstStep.title')}
              subtitle={t('firstStep.subtitle')}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" /></svg>}
            />
            <p className="text-sm font-bold text-charcoal leading-relaxed">{shownPlan.first_step.action}</p>
            <div className="mt-3 space-y-1.5 text-xs leading-relaxed text-charcoal/70">
              {shownPlan.first_step.why && <p><span className="font-bold text-charcoal">{t('firstStep.why')}:</span> {shownPlan.first_step.why}</p>}
              {shownPlan.first_step.output && <p><span className="font-bold text-charcoal">{t('firstStep.output')}:</span> {shownPlan.first_step.output}</p>}
              {shownPlan.first_step.when && <p><span className="font-bold text-charcoal">{t('firstStep.when')}:</span> {shownPlan.first_step.when}</p>}
            </div>
            {shownPlan.first_step.worksheet?.length > 0 && (
              <div className="mt-3 rounded-xl bg-teal/5 border border-teal/20 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-charcoal/60 mb-1.5">{t('firstStep.worksheet')}</p>
                <ul className="space-y-1 text-xs text-charcoal/75 list-disc ps-4">
                  {shownPlan.first_step.worksheet.map((w: string, i: number) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
            {shownPlan.first_step.follow_on && (
              <p className="mt-3 text-xs text-charcoal/70"><span className="font-bold text-charcoal">{t('firstStep.followOn')}:</span> {shownPlan.first_step.follow_on}</p>
            )}
          </div>
        )}

        {shownPlan?.first_step?.action && (
          tier === 'free' ? (
            <LockedSection
              tag={t('firstStep.lockedTag')}
              title={t('firstStep.lockedTitle')}
              body={t('firstStep.lockedBody')}
              ctaLabel={t('firstStep.lockedCta')}
              ctaHref="/#pricing"
            />
          ) : shownPlan.week_plan?.length > 0 ? (
            <div className="card p-5">
              <SectionHead
                title={t('firstStep.weekTitle')}
                subtitle={t('firstStep.weekSubtitle')}
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>}
              />
              <ol className="space-y-3">
                {shownPlan.week_plan.map((w: any, i: number) => (
                  <li key={i} className="flex gap-3">
                    <span className="shrink-0 w-16 text-[11px] font-bold uppercase tracking-wide text-primary pt-0.5">{w.when}</span>
                    <div className="text-xs leading-relaxed text-charcoal/70">
                      <p className="font-bold text-charcoal">{w.action}</p>
                      {w.why && <p>{w.why}</p>}
                      {w.output && <p><span className="font-bold text-charcoal">{t('firstStep.output')}:</span> {w.output}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ) : null
        )}

        {/* Action Plan */}
        {actionPlan && (actionPlan.month_1?.length > 0 || actionPlan.months_2_3?.length > 0 || actionPlan.months_4_6?.length > 0) && (
          <div className="card p-5">
            <SectionHead
              title={t('actionPlan.title')}
              subtitle={t('actionPlan.subtitle')}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                [t('actionPlan.month1'), actionPlan.month_1],
                [t('actionPlan.months2to3'), actionPlan.months_2_3],
                [t('actionPlan.months4to6'), actionPlan.months_4_6],
              ].map(([label, items], colIdx) => (
                (items as string[])?.length > 0 && (
                  <div key={label as string} className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-[11px] font-bold shrink-0">
                        {colIdx + 1}
                      </span>
                      <p className="text-xs font-bold text-charcoal uppercase tracking-wide">{label}</p>
                    </div>
                    {colIdx < 2 && (
                      <span className="hidden sm:block absolute top-3 left-full w-5 h-px bg-[var(--line-strong)] -translate-x-1" />
                    )}
                    <ul className="space-y-2.5 border-l-2 border-primary/15 pl-3.5">
                      {(items as string[]).map((item, i) => (
                        <li key={i} className="text-xs leading-relaxed text-charcoal/70 relative">
                          <span className="absolute -left-[19px] top-1 w-2 h-2 rounded-full bg-teal/80" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              ))}
            </div>
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
            {(() => {
              // One card per recommended career. The top match (index 0 of the full list) is highlighted.
              const renderCareer = (job: any) => {
                const i = jobs.indexOf(job)
                const isNew = job.direction_tag === 'new_direction'
                const rejected = recFeedback[job.title]
                const top = i === 0 && !rejected
                // One-word AI risk from the AI Impact section (top matches only); the detail stays in that section.
                const aiRisk: string | undefined = aiImpact?.careers?.find((c: any) => String(c.title || '').toLowerCase() === String(job.title || '').toLowerCase())?.ai_risk_level
                return (
                  <div
                    key={job.title}
                    className={`rounded-xl px-3.5 py-3 ${
                      top ? 'bg-primary text-white' : 'bg-lightblue/50 border border-[var(--line)]'
                    } ${rejected ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-bold capitalize ${top ? 'text-white' : 'text-charcoal'}`}>{job.title}</p>
                      {typeof job.match_score === 'number' && (
                        <span className={`text-xs font-semibold shrink-0 ${top ? 'text-white/90' : 'text-teal'}`}>
                          {job.match_score}% {t('suggestedCareers.matchLabel')}
                        </span>
                      )}
                    </div>
                    {(job.fit_tag || job.direction_tag || aiRisk) && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {job.fit_tag && ['strong_fit', 'worth_exploring'].includes(job.fit_tag) && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            top ? 'bg-white/20 text-white' : 'bg-teal/10 text-teal'
                          }`}>
                            {t(`suggestedCareers.fitTag.${job.fit_tag}`)}
                          </span>
                        )}
                        {job.direction_tag && ['builds_on_background', 'new_direction'].includes(job.direction_tag) && (
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                            top ? 'border-white/30 text-white/90' : 'border-[var(--line-strong)] text-charcoal/50'
                          }`}>
                            {t(`suggestedCareers.directionTag.${job.direction_tag}`)}
                          </span>
                        )}
                        {aiRisk && ['low', 'medium', 'high'].includes(aiRisk) && (
                          <a href="#ai-impact" title={t('suggestedCareers.aiRiskLink')} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            top ? 'bg-white/20 text-white'
                              : aiRisk === 'low' ? 'bg-teal/10 text-teal'
                              : aiRisk === 'medium' ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}>
                            {levelLabel(aiRisk).toUpperCase()} {t('aiImpact.riskSuffix')}
                          </a>
                        )}
                      </div>
                    )}
                    {job.fit_summary && (
                      <p className={`text-xs mt-1 ${top ? 'text-white/80' : 'text-charcoal/60'}`}>{job.fit_summary}</p>
                    )}
                    {job.gap && (
                      <p className={`text-xs mt-1.5 ${top ? 'text-white/85' : 'text-charcoal/70'}`}>
                        <span className="font-bold">{t(isNew ? 'suggestedCareers.gapPaths' : 'suggestedCareers.gapBuild')}:</span> {job.gap}
                      </p>
                    )}
                    {job.next_action && (
                      <p className={`text-xs mt-1 ${top ? 'text-white/85' : 'text-charcoal/70'}`}>
                        <span className="font-bold">{t('suggestedCareers.nextAction')}:</span> {job.next_action}
                      </p>
                    )}
                    <div className={`mt-2 flex flex-wrap items-center gap-1.5 text-[11px] ${top ? 'text-white/80' : 'text-charcoal/50'}`}>
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
                      <p className="text-sm font-extrabold text-charcoal">{g.title}</p>
                      <p className="text-xs text-charcoal/50 mb-2.5">{g.subtitle}</p>
                      <div className="space-y-2.5">{rejectedLast(g.items).map(renderCareer)}</div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        )}

      </>),
    majors: (<>
        {/* Majors & Exposure — students' practical track, alongside Internships & Exposure above */}
        {studentTrack && (
          <div className="card p-5">
            <SectionHead
              title={t('studentTrack.title')}
              subtitle={t('studentTrack.subtitle')}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443" /></svg>}
            />
            {studentTrack.majors_guidance && (
              <p className="text-sm text-charcoal/70 mb-4">{studentTrack.majors_guidance}</p>
            )}
            {studentTrack.majors?.length > 0 && (
              <div className="space-y-2 mb-4">
                {studentTrack.majors.map((m: any, i: number) => (
                  <div key={i} className="border border-[var(--line)] border-s-4 border-s-teal rounded-xl p-3.5">
                    <p className="text-sm font-bold text-charcoal">{m.name}</p>
                    {m.why_fit && <p className="text-xs text-charcoal/60 mt-0.5">{m.why_fit}</p>}
                    {m.careers?.length > 0 && (
                      <p className="text-xs text-charcoal/70 mt-1.5"><span className="font-bold text-charcoal">{t('studentTrack.leadsTo')}:</span> {m.careers.join(' · ')}</p>
                    )}
                    {m.try_it && (
                      <p className="text-xs text-charcoal/70 mt-1"><span className="font-bold text-charcoal">{t('studentTrack.tryIt')}:</span> {m.try_it}</p>
                    )}
                  </div>
                ))}
                {tier === 'free' && (
                  <p className="text-xs text-charcoal/50">{t('studentTrack.lockedMajors')}</p>
                )}
              </div>
            )}
            {studentTrack.exposure_ideas?.length > 0 && (
              <div className="space-y-2">
                {studentTrack.exposure_ideas.map((idea: any, i: number) => (
                  <div key={i} className="border border-[var(--line)] rounded-xl p-3.5">
                    <p className="text-sm font-bold text-charcoal">{idea.title}</p>
                    {idea.why && <p className="text-xs text-charcoal/50 mt-0.5">{idea.why}</p>}
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
              <p className="text-sm leading-relaxed text-charcoal/80">{careerPath.narrative}</p>
            </div>
            {careerPath.next_steps?.length > 0 && (
              <div className="space-y-2">
                {careerPath.next_steps.map((step: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 text-xs text-charcoal/70 leading-relaxed border border-[var(--line)] rounded-xl p-3 hover:border-primary/30 hover:bg-lightblue/30 transition-colors">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal/15 text-teal text-[10px] font-bold shrink-0 mt-0.5">
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
                      <p className="text-sm font-bold text-charcoal group-hover:text-primary truncate">{job.title}</p>
                      <p className="text-xs text-charcoal/50 truncate">{job.company} · {job.location}</p>
                      <p className="text-xs text-charcoal/40 mt-0.5">
                        {job.is_internship && !listingsAsInternships && <span className="chip !py-0 !text-[10px] me-1.5">{t('liveJobs.internshipTag')}</span>}
                        {t('liveJobs.for')}: {job.matched_career}
                      </p>
                      {(postedLabel(job.posted_at) || requiresLabel(job)) && (
                        <p className="text-[11px] text-charcoal/40 mt-0.5">
                          {postedLabel(job.posted_at) && <>{t('liveJobs.posted', { when: postedLabel(job.posted_at) as string })}</>}
                          {postedLabel(job.posted_at) && requiresLabel(job) && ' · '}
                          {requiresLabel(job) && <>{t('liveJobs.requires')}: {requiresLabel(job)}</>}
                        </p>
                      )}
                    </a>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="chip !py-0.5 !text-[11px]">{job.source}</span>
                      <button
                        onClick={() => saveJob(job, i)}
                        disabled={savedJobs.has(i)}
                        className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                          savedJobs.has(i)
                            ? 'bg-teal/10 text-teal border-teal/20'
                            : 'bg-white text-charcoal/50 border-[var(--line-strong)] hover:border-primary hover:text-primary'
                        }`}
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
                        <p className="text-sm font-bold text-charcoal truncate">{job.title}</p>
                        <p className="text-xs text-charcoal/50 truncate">{job.company} · {job.location}</p>
                      </div>
                      <span className="chip !py-0.5 !text-[11px]">{job.source}</span>
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
                <div key={i} className="border border-[var(--line)] rounded-xl p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-charcoal">{cert.title}</p>
                    {cert.provider_type && <span className="chip !py-0.5 !text-[11px]">{cert.provider_type}</span>}
                  </div>
                  {cert.why && <p className="text-xs text-charcoal/50 mt-0.5">{cert.why}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

      </>),
    courses: (<>
        {/* Course Recommendations */}
        {courses.length > 0 ? (
          <div className="card p-5">
            <SectionHead
              title={t('courses.title')}
              subtitle={t('courses.subtitle')}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>}
            />
            <div className="space-y-2">
              {courses.map((course: any) => (
                <a
                  key={course.id}
                  href={course.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start justify-between gap-3 border border-[var(--line)] rounded-xl p-3.5 hover:border-[var(--line-strong)] hover:bg-lightblue/50 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-charcoal group-hover:text-primary truncate">{course.title}</p>
                    <p className="text-xs text-charcoal/50 truncate">{course.provider} · {course.level}{course.duration_hours ? ` · ${course.duration_hours}h` : ''}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 border ${course.is_free ? 'bg-teal/10 text-teal border-teal/20' : 'bg-lightblue text-primary border-[var(--line)]'}`}>
                    {course.is_free ? t('courses.free') : t('courses.paid')}
                  </span>
                </a>
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
            <p className="text-sm text-charcoal/60 mb-2">{t('error.coursesLoadFailed')}</p>
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
                    <p className="text-sm font-bold text-charcoal group-hover:text-primary truncate">{company.name_en}</p>
                    <p className="text-xs text-charcoal/50 truncate">{company.sector}{company.is_government ? ` · ${t('companies.government')}` : ''}</p>
                  </div>
                  <span className="chip !py-0.5 !text-[11px]">{t('companies.view')}</span>
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
            <p className="text-sm text-charcoal/60 mb-2">{t('error.companiesLoadFailed')}</p>
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
            <p className="text-sm text-charcoal/70 mb-4 leading-relaxed">{aiImpact.overall_summary}</p>
            {aiImpact.focus && tier !== 'free' && (
              <div className="mb-4 rounded-xl border border-teal/30 bg-teal/5 p-4">
                <p className="text-sm font-bold text-charcoal mb-2">{t('aiImpact.focusTitle')}: {aiImpact.focus.title}</p>
                {aiImpact.focus.skills_to_build?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[11px] font-semibold text-charcoal/50 uppercase tracking-wide mb-1">{t('aiImpact.skillsLabel')}</p>
                    <ul className="space-y-1">
                      {aiImpact.focus.skills_to_build.map((sk: any, i: number) => (
                        <li key={i} className="text-xs text-charcoal/70"><span className="font-bold text-charcoal">{sk.skill}</span> — {sk.why}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiImpact.focus.exercise?.task && (
                  <div className="text-xs text-charcoal/70 space-y-1">
                    <p><span className="font-bold text-charcoal">{t('aiImpact.exerciseLabel')}:</span> {aiImpact.focus.exercise.task}</p>
                    {aiImpact.focus.exercise.work_sample && (
                      <p><span className="font-bold text-charcoal">{t('aiImpact.workSampleLabel')}:</span> {aiImpact.focus.exercise.work_sample}</p>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="space-y-3">
              {aiImpact.careers?.map((c: any) => (
                <div key={c.title} className="border border-[var(--line)] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-charcoal">{c.title}</span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      c.ai_risk_level === 'low' ? 'bg-teal/10 text-teal' :
                      c.ai_risk_level === 'medium' ? 'bg-amber-50 text-amber-700' :
                      'bg-rose-50 text-rose-700'
                    }`}>
                      {c.ai_risk_level ? levelLabel(c.ai_risk_level).toUpperCase() : ''} {t('aiImpact.riskSuffix')}
                    </span>
                  </div>
                  {c.global_evidence && (
                    <p className="text-xs text-charcoal/60 mb-1.5"><span className="font-semibold text-charcoal/70">{t('aiImpact.globalEvidenceLabel')}:</span> {c.global_evidence}</p>
                  )}
                  <p className="text-xs text-charcoal/50 mb-3">
                    {c.global_evidence && <span className="font-semibold text-charcoal/70">{t('aiImpact.localOutlookLabel')}: </span>}
                    {c.gcc_outlook}
                  </p>
                  {c.protected_skills?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[11px] font-semibold text-charcoal/40 uppercase tracking-wide mb-1.5">{t('aiImpact.protectedSkillsLabel')}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {c.protected_skills.map((s: string) => (
                          <span key={s} className="chip chip-teal !py-0.5 !text-[11px]">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {c.upskilling?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-charcoal/40 uppercase tracking-wide mb-1.5">{t('aiImpact.upskillingLabel')}</p>
                      <ul className="space-y-1">
                        {c.upskilling.map((tip: string) => (
                          <li key={tip} className="text-xs text-charcoal/50 flex gap-1.5">
                            <span className="text-primary mt-0.5">→</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {c.what_this_means_for_you && (
                    <p className="text-xs font-semibold text-charcoal/70 mt-3 pl-2.5 border-l-2 border-teal">
                      {t('aiImpact.whatThisMeansLabel')}: <span className="font-normal">{c.what_this_means_for_you}</span>
                    </p>
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
            <div className="flex gap-2 flex-wrap">
              {summary.riasec.top_types.map((rt: string, i: number) => (
                <span key={rt} className={i === 0 ? 'chip chip-solid' : 'chip'}>{riasecLabel(rt)}</span>
              ))}
            </div>
          </div>

          {/* Core Values */}
          <div className="card p-5">
            <SectionHead
              title={t('coreValues.title')}
              subtitle={t('coreValues.subtitle')}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>}
            />
            <div className="flex gap-2 flex-wrap">
              {summary.values.top_values.map((v: string, i: number) => (
                <span key={v} className={i === 0 ? 'chip chip-teal font-bold' : 'chip'}>{valueLabel(v)}</span>
              ))}
            </div>
          </div>

          {/* Top Strengths */}
          <div className="card p-5">
            <SectionHead
              title={t('topStrengths.title')}
              subtitle={t('topStrengths.subtitle')}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>}
            />
            <div className="flex gap-2 flex-wrap">
              {summary.strengths.top_strengths.map((s: string, i: number) => (
                <span key={s} className={i === 0 ? 'chip chip-solid' : 'chip'}>{strengthLabel(s)}</span>
              ))}
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
                    <span className="text-xs font-medium text-charcoal/70">{traitLabel(trait)}</span>
                    <span className="chip !py-0.5 !text-[11px]">{levelLabel(level)}</span>
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
                    <span className="text-xs font-medium text-charcoal/50">{label}</span>
                    <span className="chip chip-teal !py-0.5 !text-[11px]">{score >= 50 ? high : low}</span>
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
  const DEFAULT_ORDER = ['summary', 'careers', 'plan', 'jobs', 'courses', 'companies', 'ai', 'profile']
  const knownKeys = Object.keys(sectionBlocks)
  const baseOrder = (sectionOrder && sectionOrder.length ? sectionOrder : DEFAULT_ORDER).filter(k => knownKeys.includes(k))
  const orderedKeys = [...baseOrder, ...knownKeys.filter(k => !baseOrder.includes(k))]

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
              <button
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
              </button>
            </div>
            {downloadError && <p className="text-rose-200 text-xs">{downloadError}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 mt-8 pb-16 space-y-4 relative z-10">

        {/* Result Stage feedback — non-blocking, shows on every visit until answered */}
        {betaMode && (
          <BetaFeedbackResultStage responseId={id} locale={locale} initiallyDone={resultStageDone} />
        )}

        {/* Signup CTA */}
        {!loggedIn && (
          <div className="card p-5 flex items-center justify-between gap-4 flex-wrap border-l-4 border-l-teal">
            <div>
              <p className="text-sm font-bold text-charcoal">{t('signup.title')}</p>
              <p className="text-xs text-charcoal/50 mt-0.5">{t('signup.subtitle')}</p>
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

        {orderedKeys.map(k => <Fragment key={k}>{sectionBlocks[k]}</Fragment>)}

        {/* Reassess */}
        {/*
        <div className="flex flex-col items-center gap-2 pt-4">
          <button
            onClick={reassess}
            disabled={reassessing}
            className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full border border-[var(--line-strong)] text-charcoal/60 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
          >
            <svg className={`w-3.5 h-3.5 ${reassessing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            {reassessing ? 'Refreshing…' : 'Refresh AI impact & job data'}
          </button>
          <p className="text-[11px] text-charcoal/35">Pulls the latest market data — your personality profile stays the same</p>
          {reassessError && <p className="text-xs text-rose-500">{reassessError}</p>}
        </div>
        */}

        {/* Share */}
        <div className="flex flex-col items-center gap-2 pt-2 pb-4">
          <p className="text-sm text-charcoal/40">{t('share')}</p>
          <CopyLinkButton />
        </div>

      </div>
    </div>
  )
}
