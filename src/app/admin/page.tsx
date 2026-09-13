'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Logomark from '@/components/brand/Logomark'
import DashboardStatsView, { type DashboardStats } from '@/components/admin/DashboardStatsView'
import EmailTemplatesTab from '@/components/admin/EmailTemplatesTab'
import EmailSchedulerTab from '@/components/admin/EmailSchedulerTab'
import SmtpSettingsTab from '@/components/admin/SmtpSettingsTab'
import { questions, BEHAVIORAL_SCALE, type Question } from '@/data/questions'

const levelToWidth: Record<string, string> = {
  low: '20%',
  'low-moderate': '38%',
  moderate: '52%',
  'moderate-high': '68%',
  high: '88%',
}

// O*NET Interest Profiler share-code decoder.
// The 5-char code in /s/scores/<code> encodes all 6 RIASEC scores using a
// base-41 alphabet. Each score is 0-20. Extracted from onetinterestprofiler.org
// bundle — no network call needed.
const ONET_IV = 'hCxDrnvJVB3StXLqg54Gpj7QkPzZ69scHRKTNbfFd'

function decodeOnetUrl(url: string): Record<string, number> | null {
  try {
    const match = new URL(url).pathname.match(/\/s\/scores\/([A-Za-z0-9]{5})$/)
    if (!match) return null
    const idx = match[1].split('').map(c => ONET_IV.indexOf(c))
    if (idx.includes(-1)) return null
    const e = idx[0] * 2825761 + idx[1] * 68921 + idx[2] * 1681 + idx[3] * 41 + idx[4]
    if (Math.floor(e / 4084101) > 20) return null
    return {
      realistic:     Math.floor(e / 4084101),
      investigative: Math.floor(e / 194481) % 21,
      artistic:      Math.floor(e / 9261)   % 21,
      social:        Math.floor(e / 441)    % 21,
      enterprising:  Math.floor(e / 21)     % 21,
      conventional:  e % 21,
    }
  } catch { return null }
}

function topRiasecTypes(scores: Record<string, number>, n = 3): string[] {
  return Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k)
}

function riasecAgreement(ours: string[], onet: string[]) {
  const matching = ours.filter(t => onet.includes(t))
  const onlyOurs = ours.filter(t => !onet.includes(t))
  const onlyOnet = onet.filter(t => !ours.includes(t))
  const score    = Math.round(matching.length / Math.max(ours.length, onet.length, 1) * 100)
  const verdict  =
    score >= 90 ? 'Both assessments strongly agree — high confidence in this career profile.' :
    score >= 60 ? 'Good alignment between the two assessments — results are broadly consistent.' :
    score >= 34 ? 'Partial agreement — the assessments highlight different facets of the profile.' :
                  'Results diverge — worth discussing both with a career coach for deeper insight.'
  return { matching, onlyOurs, onlyOnet, score, verdict }
}

type Submission = {
  id: string
  full_name: string
  email: string
  phone: string
  country: string
  nationality: string
  age: number | null
  age_bracket: string | null // legacy bracket field, still populated on rows submitted before the exact-age question shipped
  experience_level: string | null
  education_field: string[]
  major_was_own_choice: string | null // 'yes' | 'no' | null (not asked, e.g. high-school users)
  major_choice_reason: string | null // only set when major_was_own_choice === 'no'
  career_direction: string | null // 'stay_in_field' | 'change_field' | 'not_sure' | null
  current_stage: string
  completed: boolean
  created_at: string
  cohort_override: 'beta' | 'beta_v2' | null
}

// Resolves a raw stored answer (option value(s), a 1-6 scale number, or free
// text) back to the human-readable label a reviewer would recognize — so the
// admin answers panel reads like the assessment itself, not a value dump.
function formatAnswer(q: Question, raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return '—'
  if (q.type === 'behavioral_scale') {
    const opt = BEHAVIORAL_SCALE.find(o => String(o.value) === String(raw))
    return opt ? `${raw} — ${opt.label}` : String(raw)
  }
  if (q.type === 'multi_select' && Array.isArray(raw)) {
    return raw.map(v => q.options?.find(o => o.value === v)?.label || String(v)).join(', ')
  }
  if (q.options) {
    return q.options.find(o => o.value === raw)?.label || String(raw)
  }
  return String(raw)
}

// Sorted horizontal-bar chart for one framework's full dimension breakdown
// (backend now returns every dimension's score, not just the top few) — used
// for RIASEC/values/strengths/Big Five in the submission detail view so a
// reviewer sees the whole profile shape at a glance instead of three chips.
// `labels` overrides the numeric badge per-dimension (Big Five's low/medium/
// high reads better than its raw score); omit it to show the rounded score.
function DimensionBarChart({ title, subtitle, scores, labels, barColor, badgeClass }: {
  title: string
  subtitle?: string
  scores: Record<string, number>
  labels?: Record<string, string>
  barColor: string
  badgeClass: string
}) {
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1])
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">{title}</h3>
      {subtitle && <p className="text-xs text-slate-400 mt-1 mb-4">{subtitle}</p>}
      <div className={subtitle ? 'space-y-3' : 'space-y-3 mt-4'}>
        {entries.map(([dim, score]) => (
          <div key={dim}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-slate-600 capitalize">{dim.replace(/_/g, ' ')}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${badgeClass}`}>
                {labels?.[dim] ?? Math.round(score)}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className={`${barColor} h-2 rounded-full`} style={{ width: `${Math.max(2, score)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Beta cohort = everyone who took the assessment from the day the beta invite
// went out onward (previously this badge was labeled "v2" and anchored to an
// unrelated redesign date).
const BETA_COHORT_START = new Date('2026-09-06')
function isBetaSubmission(sub: Pick<Submission, 'created_at'>) {
  return new Date(sub.created_at) >= BETA_COHORT_START
}

// Second wave of the same beta cohort, starting once the round of fixes/
// features shipped on 2026-09-08 went live — lets us compare behavior
// before/after that batch of changes without touching anything already
// tagged plain "beta".
const BETA_V2_START = new Date('2026-09-08T11:37:56Z')
function isBetaV2(createdAt: string) {
  return new Date(createdAt) >= BETA_V2_START
}

// Display label for the beta/beta-v2 badge — `cohort_override` (set by hand via
// SQL for the rare case someone's timestamp landed on the wrong side of the
// cutoff) always wins over the date-based default.
function cohortLabel(row: { created_at: string; cohort_override?: 'beta' | 'beta_v2' | null }): 'beta' | 'beta v2' {
  if (row.cohort_override === 'beta') return 'beta'
  if (row.cohort_override === 'beta_v2') return 'beta v2'
  return isBetaV2(row.created_at) ? 'beta v2' : 'beta'
}

type BetaFeedbackStage = 'started' | 'stage1' | 'result' | 'stage2'
function betaFeedbackStageOf(bf: Pick<BetaFeedbackEntry, 'stage1_completed_at' | 'result_stage_completed_at' | 'stage2_completed_at'>): BetaFeedbackStage {
  return bf.stage2_completed_at ? 'stage2' : bf.result_stage_completed_at ? 'result' : bf.stage1_completed_at ? 'stage1' : 'started'
}
const BETA_FEEDBACK_STAGE_LABELS: Record<BetaFeedbackStage, string> = {
  started: 'Started',
  stage1: 'Stage 1',
  result: 'Result Stage',
  stage2: 'Stage 2',
}

// ─── Beta feedback analytics (charts) ──────────────────────────────────────
// Small, dependency-free primitives built from the app's own design tokens
// (--primary, --teal, and the green/amber/rose badge colors already used
// elsewhere in this dashboard) rather than a charting library — the data
// here is a handful of categorical breakdowns and one 1-6 scale, well within
// what plain divs/SVG can express cleanly.

function countBy<T>(items: T[], getKey: (item: T) => string | null | undefined): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const item of items) {
    const key = getKey(item)
    if (!key) continue
    counts[key] = (counts[key] || 0) + 1
  }
  return counts
}

// Ordered so bars render in a consistent, meaningful sequence (positive → negative)
// rather than whatever order values happen to appear in the data.
const SENTIMENT_ORDER: Record<string, string[]> = {
  would_recommend: ['yes', 'maybe', 'no'],
  would_pay: ['definitely', 'maybe', 'no'],
  would_pay_at_price: ['yes_today', 'yes_if_cheaper', 'maybe_later', 'no'],
  accuracy: ['spot_on', 'mostly_right', 'off'],
  yes_somewhat_no: ['yes', 'somewhat', 'no'],
  career_explained: ['yes', 'partly', 'no'],
  wants_coach_session: ['yes_pay', 'if_included', 'no'],
}
const SENTIMENT_COLOR: Record<string, string> = {
  yes: '#00C9A7', definitely: '#00C9A7', spot_on: '#00C9A7', yes_today: '#00C9A7', yes_pay: '#00C9A7',
  maybe: '#F59E0B', mostly_right: '#F59E0B', somewhat: '#F59E0B', yes_if_cheaper: '#F59E0B',
  maybe_later: '#F59E0B', partly: '#F59E0B', if_included: '#F59E0B',
  no: '#FB7185', off: '#FB7185',
}
const SENTIMENT_LABEL: Record<string, string> = {
  yes: 'Yes', maybe: 'Maybe', no: 'No', definitely: 'Definitely',
  spot_on: 'Spot on', mostly_right: 'Mostly right', off: 'Off', somewhat: 'Somewhat',
  yes_today: 'Yes, today', yes_if_cheaper: 'Yes, if cheaper', maybe_later: 'Maybe later',
  partly: 'Partly', yes_pay: "Yes, I'd pay for it", if_included: 'Only if included',
}

// Demographic breakdowns (age_bracket, current_stage) come from the onboarding
// questions on assessment_responses, not from beta_feedback itself — every
// beta submission has them regardless of whether stage2 feedback was ever
// completed, so these charts use the full beta_feedback list rather than the
// stage2-only subset the survey charts above are filtered to.
const AGE_BRACKET_ORDER = ['under_16', '16_18', '19_22', '23_26', '27_32', '33_40', '41_plus']
const AGE_BRACKET_LABEL: Record<string, string> = {
  under_16: 'Under 16', '16_18': '16–18', '19_22': '19–22', '23_26': '23–26',
  '27_32': '27–32', '33_40': '33–40', '41_plus': '41+',
}
// Submissions before the exact-age question shipped only have age_bracket;
// submissions after it only have age (age_bracket is null). This buckets an
// exact age into the same 7 ranges so the "Age group" chart/export stay
// continuous across the cutover instead of splitting into two incomparable
// series.
function ageToBracket(age: number | null | undefined): string | null {
  if (age === null || age === undefined || !Number.isFinite(age)) return null
  if (age < 16) return 'under_16'
  if (age <= 18) return '16_18'
  if (age <= 22) return '19_22'
  if (age <= 26) return '23_26'
  if (age <= 32) return '27_32'
  if (age <= 40) return '33_40'
  return '41_plus'
}
const EXPERIENCE_LEVEL_ORDER = ['student', 'fresh_grad', 'up_to_1yr', 'up_to_3yrs', 'up_to_5yrs', '10yrs_plus']
const EXPERIENCE_LEVEL_LABEL: Record<string, string> = {
  student: 'Still a student', fresh_grad: 'Fresh graduate', up_to_1yr: 'Up to 1 year',
  up_to_3yrs: 'Up to 3 years', up_to_5yrs: 'Up to 5 years', '10yrs_plus': '10+ years',
}
const CAREER_DIRECTION_LABEL: Record<string, string> = {
  stay_in_field: 'Stay close to field', change_field: 'Move into something different', not_sure: 'Not sure yet',
}
// Labels below mirror the current Stage 2 beta-feedback form (src/components/beta-feedback/content.ts).
const CAREER_EXPLAINED_LABEL: Record<string, string> = { yes: 'Yes', partly: 'Partly', no: 'No' }
const CAREERS_CONSIDERED_LABEL: Record<string, string> = { none: 'None', one: '1', a_few: '2–3', four_or_five: '4–5' }
const REPORT_SECTION_LABEL: Record<string, string> = {
  personality: 'Personality profile', values: 'Values', strengths: 'Strengths', careers: 'Career matches',
  ai_impact: 'AI Impact', jobs: 'Job listings', companies: 'Target companies', courses: 'Courses', plan: '90-day plan',
}
const WOULD_PAY_AT_PRICE_LABEL: Record<string, string> = {
  yes_today: 'Yes, today', yes_if_cheaper: 'Yes, if cheaper', maybe_later: 'Maybe later', no: 'No',
}
const PAY_BLOCKER_LABEL: Record<string, string> = {
  careers_dont_fit: "Careers don't feel right", free_results_enough: 'Free results already enough',
  not_sure_next_step: 'Not sure what to do next', doesnt_reflect_situation: "Doesn't reflect their situation",
  want_coach_first: 'Wants to speak with a coach first', price_higher_than_expected: 'Price higher than expected',
  dont_usually_pay: "Doesn't usually pay for career tools", someone_else_decides: 'Someone else decides',
  dont_need_guidance_now: "Doesn't need guidance right now", other: 'Other',
}
const WORTH_PAYING_FOR_LABEL: Record<string, string> = {
  plan_for_stage: 'A plan for their stage', internships_jobs: 'Internships or jobs', certifications: 'Certifications',
  coach_session: 'A session with a coach', deeper_ai_outlook: 'Deeper AI outlook', shareable_report: 'Shareable family report',
  other: 'Other',
}
const WANTS_COACH_LABEL: Record<string, string> = { yes_pay: "Yes, I'd pay for it", if_included: 'Only if included', no: 'No' }
// "current_stage" is the closest proxy we collect to employment status — it's
// an education/career-stage question, not a strict employed/unemployed flag.
const CURRENT_STAGE_ORDER = ['high_school', 'university', 'recent_graduate', 'working_exploring', 'career_changer', 'returning', 'between_roles']
const CURRENT_STAGE_LABEL: Record<string, string> = {
  high_school: 'High school', university: 'University', recent_graduate: 'Recent graduate',
  working_exploring: 'Working, exploring', career_changer: 'Career changer',
  returning: 'Returning to work', between_roles: 'Between roles',
}
// Order/labels match QO1/QO2 in messages/en.json exactly.
const COUNTRY_ORDER = ['saudi_arabia', 'bahrain', 'uae', 'kuwait', 'qatar', 'oman', 'other_gcc', 'other_middle_east', 'other']
const COUNTRY_LABEL: Record<string, string> = {
  saudi_arabia: 'Saudi Arabia', bahrain: 'Bahrain', uae: 'UAE', kuwait: 'Kuwait', qatar: 'Qatar',
  oman: 'Oman', other_gcc: 'Other GCC', other_middle_east: 'Other Middle East', other: 'Other',
}
const NATIONALITY_ORDER = ['saudi', 'bahraini', 'emirati', 'kuwaiti', 'qatari', 'omani', 'other']
const NATIONALITY_LABEL: Record<string, string> = {
  saudi: 'Saudi', bahraini: 'Bahraini', emirati: 'Emirati', kuwaiti: 'Kuwaiti',
  qatari: 'Qatari', omani: 'Omani', other: 'Other',
}

function BetaStatTile({ label, value, sublabel, onClick }: { label: string; value: string; sublabel?: string; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-left w-full ${onClick ? 'hover:border-primary/40 hover:shadow-md transition-all cursor-pointer' : ''}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-800 tabular-nums">{value}</p>
      {sublabel && <p className="text-xs text-slate-400 mt-0.5">{sublabel}</p>}
    </Tag>
  )
}

// One labeled horizontal bar — `total` is the denominator (usually all stage2
// respondents), so an unanswered field still reads as a share of the whole
// rather than silently renormalizing over just the people who answered it.
function BetaBarRow({ valueKey, count, total }: { valueKey: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs text-slate-500">{SENTIMENT_LABEL[valueKey] || formatUnderscored(valueKey)}</span>
      <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: SENTIMENT_COLOR[valueKey] || '#0770BA' }} />
      </div>
      <span className="w-20 shrink-0 text-right text-xs font-semibold text-slate-700 tabular-nums">
        {pct}% <span className="text-slate-400 font-normal">({count})</span>
      </span>
    </div>
  )
}

function BetaSentimentChart({ title, orderKey, counts, total }: { title: string; orderKey: keyof typeof SENTIMENT_ORDER; counts: Record<string, number>; total: number }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <p className="text-sm font-semibold text-slate-700 mb-4">{title}</p>
      <div className="space-y-2.5">
        {SENTIMENT_ORDER[orderKey].map(key => (
          <BetaBarRow key={key} valueKey={key} count={counts[key] || 0} total={total} />
        ))}
      </div>
    </div>
  )
}

// Generic categorical breakdown with an explicit display order and label map —
// unlike BetaSentimentChart, these values (age bracket, career stage) have no
// good/bad connotation, so every bar shares one neutral color.
function BetaCategoryChart({ title, order, labels, counts, total }: { title: string; order: string[]; labels: Record<string, string>; counts: Record<string, number>; total: number }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <p className="text-sm font-semibold text-slate-700 mb-4">{title}</p>
      <div className="space-y-2.5">
        {order.map(key => {
          const count = counts[key] || 0
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs text-slate-500">{labels[key] || formatUnderscored(key)}</span>
              <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-20 shrink-0 text-right text-xs font-semibold text-slate-700 tabular-nums">
                {pct}% <span className="text-slate-400 font-normal">({count})</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// 1-6 scale distribution — reuses the sequential teal ramp (lighter = lower
// score) since this is a magnitude, not a categorical identity.
function BetaScaleChart({ title, values }: { title: string; values: (number | null)[] }) {
  const answered = values.filter((v): v is number => v != null)
  const total = answered.length
  const avg = total > 0 ? (answered.reduce((a, b) => a + b, 0) / total) : 0
  const counts = countBy(answered, v => String(v))
  const max = Math.max(1, ...[1, 2, 3, 4, 5, 6].map(n => counts[String(n)] || 0))
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <p className="text-xs text-slate-400">avg <span className="font-semibold text-slate-600">{avg.toFixed(1)}</span>/6</p>
      </div>
      <div className="flex items-end gap-2 h-24">
        {[1, 2, 3, 4, 5, 6].map(n => {
          const c = counts[String(n)] || 0
          // Pixels, not %: the column div's height is auto (hugs its content,
          // since the row uses items-end rather than stretch), so a percentage
          // height here has no defined containing block to resolve against and
          // silently computes to 0 — the bars never rendered, only the labels.
          const barPx = Math.max(4, Math.round((c / max) * 72))
          return (
            <div key={n} className="flex-1 flex flex-col items-center justify-end gap-1.5">
              <span className="text-[10px] text-slate-400 tabular-nums">{c}</span>
              <div className="w-full rounded-t-md" style={{ height: `${barPx}px`, background: `rgba(0, 201, 167, ${0.35 + (n / 6) * 0.55})` }} />
              <span className="text-[10px] text-slate-400">{n}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Assessment behavior telemetry (device type, break-panel games, pacing) ─
// Raw event log -> one row per assessment attempt. Mirrors the beta feedback
// analytics above: fetched once as a flat list, aggregated client-side.

type TelemetryEvent = {
  id: string
  session_id: string
  response_id: string | null
  event_type: 'session_start' | 'question_view' | 'break_open' | 'break_activity'
  question_id: string | null
  activity_kind: string | null
  duration_ms: number | null
  device_type: string | null
  locale: string | null
  payload: Record<string, any> | null
  created_at: string
  assessment_responses: { full_name: string | null; email: string | null } | null
}

type TelemetrySession = {
  session_id: string
  response_id: string | null
  device_type: string | null
  locale: string | null
  activities: string[]
  completed: boolean
  full_name: string | null
  email: string | null
  started_at: string
}

function buildTelemetrySessions(events: TelemetryEvent[]): TelemetrySession[] {
  const bySession = new Map<string, TelemetrySession>()
  for (const e of events) {
    let s = bySession.get(e.session_id)
    if (!s) {
      s = { session_id: e.session_id, response_id: null, device_type: null, locale: null, activities: [], completed: false, full_name: null, email: null, started_at: e.created_at }
      bySession.set(e.session_id, s)
    }
    if (e.device_type) s.device_type = e.device_type
    if (e.locale) s.locale = e.locale
    if (e.response_id) {
      s.response_id = e.response_id
      s.completed = true
      if (e.assessment_responses) {
        s.full_name = e.assessment_responses.full_name
        s.email = e.assessment_responses.email
      }
    }
    if (e.event_type === 'break_open' && e.activity_kind && !s.activities.includes(e.activity_kind)) {
      s.activities.push(e.activity_kind)
    }
    if (e.created_at < s.started_at) s.started_at = e.created_at
  }
  return [...bySession.values()]
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

type QuestionPacing = { question_id: string; section: string; reached: number; avgMs: number; medianMs: number }

function buildQuestionPacing(events: TelemetryEvent[]): QuestionPacing[] {
  const byQuestion = new Map<string, number[]>()
  for (const e of events) {
    if (e.event_type !== 'question_view' || !e.question_id || e.duration_ms == null) continue
    // A tab left open for hours (then closed) would otherwise blow out the
    // average for whatever question was on screen — cap at 10 minutes.
    if (e.duration_ms > 10 * 60 * 1000) continue
    const arr = byQuestion.get(e.question_id) || []
    arr.push(e.duration_ms)
    byQuestion.set(e.question_id, arr)
  }
  // Ordered by the real question flow (not alphabetically by id) so slow/fast
  // spots read in the order a person actually experiences them.
  return questions
    .filter(q => byQuestion.has(q.id))
    .map(q => {
      const durations = byQuestion.get(q.id)!
      return {
        question_id: q.id,
        section: q.section,
        reached: durations.length,
        avgMs: durations.reduce((a, b) => a + b, 0) / durations.length,
        medianMs: median(durations),
      }
    })
}

function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`
}

// Beta cohort for behavior data: date-based like isBetaSubmission, but keyed
// off when the attempt *started* rather than a submission's created_at — an
// abandoned attempt has no submission at all, and dropped-off behavior during
// the beta window is exactly the kind of thing worth seeing, not just
// completions.
function isBetaSession(s: Pick<TelemetrySession, 'started_at'>) {
  return new Date(s.started_at) >= BETA_COHORT_START
}

function summarizeTelemetry(events: TelemetryEvent[]) {
  const sessions = buildTelemetrySessions(events)
  return {
    sessions,
    sessionCount: sessions.length,
    completedCount: sessions.filter(s => s.completed).length,
    deviceCounts: countBy(sessions, s => s.device_type),
    activityCounts: countBy(events.filter(e => e.event_type === 'break_open'), e => e.activity_kind),
    sessionsThatPlayed: sessions.filter(s => s.activities.length > 0).length,
    pacing: buildQuestionPacing(events),
  }
}

const DEVICE_COLOR: Record<string, string> = { mobile: '#0770BA', desktop: '#00C9A7' }
const ACTIVITY_COLOR: Record<string, string> = { riddle: '#F59E0B', tic_tac_toe: '#0770BA', rps: '#8B5CF6', memory_match: '#00C9A7' }
const ACTIVITY_LABEL: Record<string, string> = { riddle: 'Riddle', tic_tac_toe: 'Tic-tac-toe', rps: 'Rock-Paper-Scissors', memory_match: 'Memory match' }

// Generic labeled horizontal bar (same visual language as BetaBarRow, but for
// arbitrary categories/colors rather than the fixed sentiment keys).
function TelemetryBarRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 text-xs text-slate-500">{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-20 shrink-0 text-right text-xs font-semibold text-slate-700 tabular-nums">
        {pct}% <span className="text-slate-400 font-normal">({count})</span>
      </span>
    </div>
  )
}

// Full behavior view (stat tiles, device/game charts, pacing table, and its
// drilldown modal) — parameterized so the same rendering serves both the
// all-users Behavior tab and the beta-filtered one.
function TelemetryBehaviorView({
  summary, drilldown, onDrilldown, onCloseDrilldown,
}: {
  summary: ReturnType<typeof summarizeTelemetry>
  drilldown: { title: string; rows: { session: TelemetrySession; note: string }[] } | null
  onDrilldown: (d: { title: string; rows: { session: TelemetrySession; note: string }[] }) => void
  onCloseDrilldown: () => void
}) {
  const { sessions, sessionCount, completedCount, deviceCounts, activityCounts, sessionsThatPlayed, pacing } = summary
  const exportSessions = () => {
    const rows: (string | number | null)[][] = [
      ['Name', 'Email', 'Device', 'Locale', 'Completed', 'Activities', 'Started at'],
      ...sessions.map(s => [
        s.full_name || '', s.email || '', s.device_type || '', s.locale || '',
        s.completed ? 'yes' : 'no', s.activities.map(a => ACTIVITY_LABEL[a] || a).join('; '),
        new Date(s.started_at).toLocaleString(),
      ]),
    ]
    downloadCSV(`beta_behavior_sessions_${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm text-slate-400">
          {sessionCount} assessment attempt{sessionCount !== 1 ? 's' : ''} tracked
        </p>
        <DownloadCSVButton onClick={exportSessions} label="Download sessions" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <BetaStatTile label="Attempts tracked" value={String(sessionCount)} />
        <BetaStatTile
          label="Completed"
          value={sessionCount > 0 ? `${Math.round((completedCount / sessionCount) * 100)}%` : '—'}
          sublabel={`${completedCount} of ${sessionCount}`}
        />
        <BetaStatTile
          label="Played a game or riddle"
          value={sessionCount > 0 ? `${Math.round((sessionsThatPlayed / sessionCount) * 100)}%` : '—'}
          sublabel={`${sessionsThatPlayed} of ${sessionCount}`}
          onClick={() => onDrilldown({
            title: 'Played a game or riddle',
            rows: sessions.filter(s => s.activities.length > 0).map(s => ({ session: s, note: s.activities.map(a => ACTIVITY_LABEL[a] || a).join(', ') })),
          })}
        />
        <BetaStatTile
          label="Mobile vs desktop"
          value={`${deviceCounts.mobile || 0} / ${deviceCounts.desktop || 0}`}
          sublabel="mobile / desktop"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <p className="text-sm font-semibold text-slate-700 mb-4">Device</p>
          <div className="space-y-2.5">
            {(['mobile', 'desktop'] as const).map(key => (
              <TelemetryBarRow
                key={key}
                label={key === 'mobile' ? 'Mobile' : 'Desktop'}
                count={deviceCounts[key] || 0}
                total={sessionCount}
                color={DEVICE_COLOR[key]}
              />
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <p className="text-sm font-semibold text-slate-700 mb-4">Games &amp; riddles opened</p>
          <div className="space-y-2.5">
            {(['riddle', 'tic_tac_toe', 'rps', 'memory_match'] as const).map(kind => (
              <TelemetryBarRow
                key={kind}
                label={ACTIVITY_LABEL[kind]}
                count={activityCounts[kind] || 0}
                total={sessionCount}
                color={ACTIVITY_COLOR[kind]}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
        <p className="text-sm font-semibold text-slate-700 mb-1">Pacing per question</p>
        <p className="text-xs text-slate-400 mb-4">Ordered by the actual question flow — sorted by average time, slowest first, so confusing or heavy questions stand out.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Section</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Question</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Reached</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Avg</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Median</th>
              </tr>
            </thead>
            <tbody>
              {[...pacing].sort((a, b) => b.avgMs - a.avgMs).map((row, i) => (
                <tr key={row.question_id} className={`border-b border-slate-50 ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                  <td className="px-3 py-2 text-slate-400 text-xs">{row.section}</td>
                  <td className="px-3 py-2 text-slate-700 font-medium">{row.question_id}</td>
                  <td className="px-3 py-2 text-right text-slate-500 tabular-nums">{row.reached}</td>
                  <td className="px-3 py-2 text-right text-slate-700 font-semibold tabular-nums">{formatSeconds(row.avgMs)}</td>
                  <td className="px-3 py-2 text-right text-slate-500 tabular-nums">{formatSeconds(row.medianMs)}</td>
                </tr>
              ))}
              {pacing.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-10 text-center text-slate-400">No pacing data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {drilldown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCloseDrilldown}>
          <div className="absolute inset-0 bg-slate-900/40" />
          <div
            className="relative bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">{drilldown.title}</h3>
                <p className="text-xs text-slate-400">{drilldown.rows.length} {drilldown.rows.length === 1 ? 'person' : 'people'}</p>
              </div>
              <button onClick={onCloseDrilldown} className="text-slate-400 hover:text-slate-600 text-xl leading-none px-1">×</button>
            </div>
            <div className="overflow-y-auto divide-y divide-slate-50">
              {drilldown.rows.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-10">No one matches this yet.</p>
              ) : drilldown.rows.map(({ session, note }) => (
                <div key={session.session_id} className="w-full flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{session.full_name || (session.completed ? 'Unknown' : 'Abandoned attempt')}</p>
                    <p className="text-xs text-slate-400 truncate">{session.email || '—'} · <span className="capitalize">{session.device_type || 'unknown device'}</span></p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-primary bg-lightblue px-2 py-1 rounded-full max-w-[45%] truncate">{note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Ranked horizontal bars for a multi-select field (respondents can pick more
// than one, so percentages don't sum to 100 — sorted descending so the most
// commonly picked value reads first).
function BetaRankedMultiChart({ title, lists, labels, total }: { title: string; lists: (string[] | null)[]; labels: Record<string, string>; total: number }) {
  const counts: Record<string, number> = {}
  for (const list of lists) {
    for (const v of list || []) counts[v] = (counts[v] || 0) + 1
  }
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const max = Math.max(1, ...rows.map(([, c]) => c))
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <p className="text-sm font-semibold text-slate-700 mb-4">{title}</p>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-400">No answers yet.</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map(([key, count]) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-xs text-slate-500 truncate">{labels[key] || formatUnderscored(key)}</span>
                <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(count / max) * 100}%` }} />
                </div>
                <span className="w-20 shrink-0 text-right text-xs font-semibold text-slate-700 tabular-nums">
                  {pct}% <span className="text-slate-400 font-normal">({count})</span>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// 100%-stacked bar per report-accuracy dimension (personality/values/strengths/
// career matches) — one bar per dimension makes it easy to spot which specific
// part of the report people trust least, instead of one blended accuracy number.
function BetaAccuracyChart({ title, dimensions }: { title: string; dimensions: { label: string; values: (string | null)[] }[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <div className="flex items-center gap-3 text-[10px] text-slate-400">
          {SENTIMENT_ORDER.accuracy.map(k => (
            <span key={k} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: SENTIMENT_COLOR[k] }} />
              {SENTIMENT_LABEL[k]}
            </span>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {dimensions.map(dim => {
          const counts = countBy(dim.values, v => v)
          const total = dim.values.filter(Boolean).length
          return (
            <div key={dim.label} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-xs text-slate-500">{dim.label}</span>
              <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden flex">
                {total === 0 ? null : SENTIMENT_ORDER.accuracy.map(key => {
                  const c = counts[key] || 0
                  if (c === 0) return null
                  return <div key={key} style={{ width: `${(c / total) * 100}%`, background: SENTIMENT_COLOR[key] }} />
                })}
              </div>
              <span className="w-10 shrink-0 text-right text-xs text-slate-400 tabular-nums">n={total}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatUnderscored(value: string | null | undefined): string {
  return value ? value.replace(/_/g, ' ') : '—'
}

function distinctValues(values: (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort()
}

// ─── CSV export ─────────────────────────────────────────────────────────────
// Plain client-side CSV (no charting/spreadsheet library) — every export below
// already has its rows in memory from the tab's own state, so there's nothing
// to fetch. A UTF-8 BOM is prepended so Excel renders the Arabic text in
// names/answers correctly instead of mangling it as Latin-1.
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function downloadCSV(filename: string, rows: (string | number | null | undefined)[][]) {
  const csv = '﻿' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function DownloadCSVButton({ onClick, label = 'Download CSV' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-600 border border-slate-100 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v13m0 0-4-4m4 4 4-4M4 20h16" />
      </svg>
      {label}
    </button>
  )
}

type FeedbackEntry = {
  id: string
  fname: string
  email: string
  age: string
  country: string | null
  source: string | null
  accurate: string | null
  rating_careers: number | null
  rating_personality: number | null
  rating_clarity: number | null
  rating_length: number | null
  rating_overall: number | null
  surprised: string | null
  careers_relevant: string | null
  ai_outlook: string | null
  recommend: string | null
  other: string | null
  created_at: string
}

type BetaFeedbackEntry = {
  id: string
  response_id: string
  user_id: string | null
  cohort: string
  locale: string | null
  s1_clarity: number | null
  s1_feeling: number | null
  s1_understood: number | null
  s1_intent: string | null
  stage1_completed_at: string | null
  language_used: string | null
  understood_after: number | null
  felt_like_mentor: string | null
  careers_seriously_considered: string | null
  career_explained: string | null
  most_useful_part: string | null
  least_useful_part: string | null
  first_action_text: string | null
  would_pay_at_price: string | null
  pay_blockers: string[] | null
  pay_blocker_other_text: string | null
  pay_blocker_priority: string | null
  worth_paying_for: string[] | null
  wants_coach_session: string | null
  would_recommend: string | null
  device: string | null
  had_issues: string | null
  issue_detail: string | null
  result_accuracy: string | null
  result_stage_completed_at: string | null
  stage2_completed_at: string | null
  // Legacy Beta 1 fields — removed from the live Stage 2 form (see the beta
  // strategy doc's Stage 2 redesign) but old rows still carry them, so kept
  // here (and shown conditionally) rather than dropped.
  personality_accuracy: string | null
  values_accuracy: string | null
  strengths_accuracy: string | null
  career_matches_accuracy: string | null
  wrong_career_text: string | null
  missing_career_text: string | null
  career_understanding_text: string | null
  ai_impact_useful: number | null
  ai_impact_credible: number | null
  ai_impact_changed_thinking: string | null
  jobs_relevant: number | null
  companies_fit: number | null
  courses_useful: number | null
  plan_would_follow: string | null
  clear_next_step: string | null
  arabic_natural: string | null
  overall_value: number | null
  most_valuable_parts: string[] | null
  would_pay: string | null
  would_pay_reason: string | null
  surprised_text: string | null
  not_me_text: string | null
  other_text: string | null
  created_at: string
  assessment_responses: { full_name: string | null; email: string | null; locale: string | null; country: string | null; nationality: string | null; age: number | null; age_bracket: string | null; experience_level: string | null; current_stage: string | null; cohort_override: 'beta' | 'beta_v2' | null } | null
}

type BugReport = {
  id: string
  source: 'user' | 'system'
  status: 'open' | 'resolved'
  description: string | null
  feature: string | null
  error_type: string | null
  error_message: string | null
  stack_trace: string | null
  response_id: string | null
  full_name: string | null
  email: string | null
  locale: string | null
  country: string | null
  device_type: string | null
  page: string | null
  user_agent: string | null
  created_at: string
}

type WaitlistEntry = {
  id: string
  email: string
  name: string | null
  country: string | null
  nationality: string | null
  phone: string | null
  status: string | null
  age: string | null
  locale: string | null
  source: string | null
  created_at: string
}

const WAITLIST_STATUS_LABELS: Record<string, string> = {
  high_school: 'High School Student',
  university: 'University Student',
  recent_graduate: 'Fresh Graduate',
  career_changer: 'Career Changer',
}

type OnetLink = {
  id: string
  email: string
  name: string | null
  onet_url: string
  label: string | null
  created_at: string
  has_assessment: boolean
}

type CountryProfile = {
  country_code: string
  country_name: string
  country_name_ar: string | null
  context_tier: string
  labour_market_authority: string | null
  nationalisation_programme: string | null
  strategic_priorities: any
  nationalisation_rates_by_sector: any
  wage_support_tiers: any
  job_boards: any
  source_url_primary: string | null
}

type CoachingSessionEntry = {
  id: string
  client_label: string | null
  topic: string | null
  session_date: string | null
  created_at: string
}

type CourseEntry = {
  id: string
  title: string
  provider: string
  url: string
  description: string | null
  skill_tags: string[]
  career_tags: string[]
  riasec_tags: string[]
  is_free: boolean
  level: string
  duration_hours: number | null
  language: string
  country_code: string | null
  created_at: string
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState('')

  const [activeTab, setActiveTab] = useState<'dashboard' | 'submissions' | 'onet' | 'feedback' | 'telemetry' | 'betaDashboard' | 'betaSubmissions' | 'betaCareerRecs' | 'betaFeedback' | 'betaBehavior' | 'betaBugs' | 'waitlist' | 'coaching' | 'country' | 'courses' | 'market' | 'testmode' | 'homepage' | 'templates' | 'emailScheduler' | 'smtp' | 'aiprovider'>('dashboard')

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState('')

  const [selected, setSelected] = useState<Submission | null>(null)
  const [results, setResults] = useState<any>(null)
  const [resultsLoading, setResultsLoading] = useState(false)
  const [adminJobs, setAdminJobs] = useState<any[]>([])
  const [adminAiImpact, setAdminAiImpact] = useState<any>(null)
  const [adminAiLoading, setAdminAiLoading] = useState(false)
  const [adminCareerRecs, setAdminCareerRecs] = useState<any[]>([])
  const [adminCareerRecsLoading, setAdminCareerRecsLoading] = useState(false)
  const [adminActionPlan, setAdminActionPlan] = useState<any>(null)
  const [adminJobListings, setAdminJobListings] = useState<any[]>([])
  const [adminJobListingsLoading, setAdminJobListingsLoading] = useState(false)
  const [adminStudentTrack, setAdminStudentTrack] = useState<any>(null)
  const [adminCertifications, setAdminCertifications] = useState<any>(null)
  const [adminCareerPath, setAdminCareerPath] = useState<any>(null)
  const [adminCompanies, setAdminCompanies] = useState<any[]>([])
  const [adminCompaniesLoading, setAdminCompaniesLoading] = useState(false)
  const [adminCourses, setAdminCourses] = useState<any[]>([])
  const [adminCoursesLoading, setAdminCoursesLoading] = useState(false)
  const [allCareerRecs, setAllCareerRecs] = useState<any[]>([])
  const [allCareerRecsLoading, setAllCareerRecsLoading] = useState(false)
  const [allCareerRecsError, setAllCareerRecsError] = useState('')
  const [careersCatalog, setCareersCatalog] = useState<any[]>([])
  const [careersCatalogLoading, setCareersCatalogLoading] = useState(false)
  const [careersCatalogError, setCareersCatalogError] = useState('')
  const [careersCatalogFilter, setCareersCatalogFilter] = useState<'recommended' | 'all' | 'approved' | 'rejected'>('recommended')
  const [careersCatalogSearch, setCareersCatalogSearch] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [adminReportLocale, setAdminReportLocale] = useState<'en' | 'ar'>('en')
  const [adminReportDownloading, setAdminReportDownloading] = useState(false)
  const [adminReportError, setAdminReportError] = useState('')
  const [adminAnswers, setAdminAnswers] = useState<Record<string, any>>({})
  const [adminAnswersLoading, setAdminAnswersLoading] = useState(false)

  const [feedbackList, setFeedbackList] = useState<FeedbackEntry[]>([])
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackEntry | null>(null)

  const [betaFeedbackList, setBetaFeedbackList] = useState<BetaFeedbackEntry[]>([])
  const [betaDemographicsFilter, setBetaDemographicsFilter] = useState<'all' | 'stage1' | 'result' | 'stage2'>('all')
  const [betaFeedbackLoading, setBetaFeedbackLoading] = useState(false)
  const [betaFeedbackError, setBetaFeedbackError] = useState('')
  const [selectedBetaFeedback, setSelectedBetaFeedback] = useState<BetaFeedbackEntry | null>(null)
  const [betaStatDrilldown, setBetaStatDrilldown] = useState<{ title: string; rows: { bf: BetaFeedbackEntry; note: string }[] } | null>(null)
  const [betaFeedbackStageFilter, setBetaFeedbackStageFilter] = useState<'all' | BetaFeedbackStage>('all')
  const [betaFeedbackStatusFilter, setBetaFeedbackStatusFilter] = useState('all')
  const [betaFeedbackAgeFilter, setBetaFeedbackAgeFilter] = useState('all')

  const [telemetryList, setTelemetryList] = useState<TelemetryEvent[]>([])
  const [telemetryLoading, setTelemetryLoading] = useState(false)
  const [telemetryError, setTelemetryError] = useState('')

  const [bugReports, setBugReports] = useState<BugReport[]>([])
  const [bugReportsLoading, setBugReportsLoading] = useState(false)
  const [bugReportsError, setBugReportsError] = useState('')
  const [bugSourceFilter, setBugSourceFilter] = useState<'all' | 'user' | 'system'>('all')
  const [bugStatusFilter, setBugStatusFilter] = useState<'all' | 'open' | 'resolved'>('open')
  const [selectedBugReport, setSelectedBugReport] = useState<BugReport | null>(null)
  const [telemetryDrilldown, setTelemetryDrilldown] = useState<{ title: string; rows: { session: TelemetrySession; note: string }[] } | null>(null)

  const [waitlistList, setWaitlistList] = useState<WaitlistEntry[]>([])
  const [waitlistLoading, setWaitlistLoading] = useState(false)
  const [waitlistError, setWaitlistError] = useState('')

  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [dashboardError, setDashboardError] = useState('')
  const [shareToken, setShareToken] = useState('')
  const [shareLinkCopied, setShareLinkCopied] = useState(false)
  const [regeneratingShareLink, setRegeneratingShareLink] = useState(false)

  const [onetLinks, setOnetLinks] = useState<OnetLink[]>([])
  const [onetLoading, setOnetLoading] = useState(false)
  const [onetError, setOnetError] = useState('')
  const [onetEmail, setOnetEmail] = useState('')
  const [onetUrl, setOnetUrl] = useState('')
  const [onetLabel, setOnetLabel] = useState('')
  const [onetAdding, setOnetAdding] = useState(false)
  const [selectedOnet, setSelectedOnet] = useState<OnetLink | null>(null)

  const [showComparison, setShowComparison]       = useState(false)
  const [comparisonResults, setComparisonResults] = useState<any>(null)
  const [comparisonLoading, setComparisonLoading] = useState(false)

  const [countryProfiles, setCountryProfiles] = useState<CountryProfile[]>([])
  const [countryLoading, setCountryLoading] = useState(false)
  const [countryError, setCountryError] = useState('')
  const [editingCountry, setEditingCountry] = useState<CountryProfile | null>(null)
  const [countryForm, setCountryForm] = useState<Partial<CountryProfile>>({})
  const [showCountryForm, setShowCountryForm] = useState(false)

  const [coachingSessions, setCoachingSessions] = useState<CoachingSessionEntry[]>([])
  const [coachingLoading, setCoachingLoading] = useState(false)
  const [coachingError, setCoachingError] = useState('')
  const [coachingSubmitting, setCoachingSubmitting] = useState(false)
  const [coachingSuccess, setCoachingSuccess] = useState('')
  const [coachingForm, setCoachingForm] = useState({
    client_label: '', topic: '', session_date: '', raw_transcript: '',
  })

  const [marketTrends, setMarketTrends] = useState<any>(null)
  const [marketLoading, setMarketLoading] = useState(false)
  const [marketError, setMarketError] = useState('')
  const [marketFetching, setMarketFetching] = useState(false)
  const [marketFetchResult, setMarketFetchResult] = useState<any>(null)
  const [marketCountryFilter, setMarketCountryFilter] = useState<'SA' | 'AE' | 'BH' | 'QA' | 'KW' | 'OM' | 'both'>('both')
  const [marketRoleFilter, setMarketRoleFilter] = useState<string>('all')

  const [courses, setCourses] = useState<CourseEntry[]>([])
  const [coursesLoading, setCoursesLoading] = useState(false)
  const [coursesError, setCoursesError] = useState('')
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [courseAdding, setCourseAdding] = useState(false)
  const [courseForm, setCourseForm] = useState({
    title: '', provider: '', url: '', description: '',
    skill_tags: '', career_tags: '', riasec_tags: '',
    is_free: false, level: 'beginner', duration_hours: '', language: 'en',
    country_code: '',
  })

  const [testModeEnabled, setTestModeEnabled] = useState(false)
  const [testModeLoading, setTestModeLoading] = useState(false)
  const [testModeSaving, setTestModeSaving] = useState(false)
  const [testModeError, setTestModeError] = useState('')

  const [homepageMode, setHomepageMode] = useState<'landing' | 'waitlist'>('landing')
  const [homepageModeLoading, setHomepageModeLoading] = useState(false)
  const [homepageModeSaving, setHomepageModeSaving] = useState(false)
  const [homepageModeError, setHomepageModeError] = useState('')

  const [aiProvider, setAiProvider] = useState<'gemini' | 'claude'>('gemini')
  const [aiProviderLoading, setAiProviderLoading] = useState(false)
  const [aiProviderSaving, setAiProviderSaving] = useState(false)
  const [aiProviderError, setAiProviderError] = useState('')

  useEffect(() => {
    fetch('/api/admin/session').then(res => {
      if (res.ok) setAuthed(true)
    })
  }, [])

  // Supabase silently refreshes the access token in the background (persistSession +
  // autoRefreshToken are on by default), but the httpOnly admin_session cookie used to
  // authenticate proxy requests is only ever set once at login. Resync it on every
  // refresh so the cookie doesn't go stale ~1h into a session while the client still
  // thinks it's logged in.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') && session?.access_token) {
        fetch('/api/admin/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: session.access_token }),
        })
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Belt-and-suspenders for the resync above: if the admin_session cookie ever does
  // go stale anyway (resync missed a beat, tab was backgrounded through a refresh),
  // every tab's data fetch starts silently 401ing and just sits there showing a
  // generic "Failed to load X" forever. Poll the same session-check endpoint used at
  // mount so a stale session bounces back to the login screen instead.
  useEffect(() => {
    if (!authed) return
    const interval = setInterval(() => {
      fetch('/api/admin/session').then(res => {
        if (!res.ok) setAuthed(false)
      })
    }, 60000)
    return () => clearInterval(interval)
  }, [authed])

  const fetchSubmissions = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    try {
      const res = await fetch('/api/admin/submissions')
      if (!res.ok) throw new Error('Failed to load submissions')
      setSubmissions(await res.json())
    } catch (err: any) {
      setFetchError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchFeedback = useCallback(async () => {
    setFeedbackLoading(true)
    setFeedbackError('')
    try {
      const res = await fetch('/api/admin/feedback')
      if (!res.ok) throw new Error('Failed to load feedback')
      setFeedbackList(await res.json())
    } catch (err: any) {
      setFeedbackError(err.message)
    } finally {
      setFeedbackLoading(false)
    }
  }, [])

  const fetchBetaFeedback = useCallback(async () => {
    setBetaFeedbackLoading(true)
    setBetaFeedbackError('')
    try {
      const res = await fetch('/api/admin/beta-feedback')
      if (!res.ok) throw new Error('Failed to load beta feedback')
      setBetaFeedbackList(await res.json())
    } catch (err: any) {
      setBetaFeedbackError(err.message)
    } finally {
      setBetaFeedbackLoading(false)
    }
  }, [])

  const fetchAllCareerRecs = useCallback(async () => {
    setAllCareerRecsLoading(true)
    setAllCareerRecsError('')
    try {
      const res = await fetch('/api/admin/career-recommendations')
      if (!res.ok) throw new Error('Failed to load career recommendations')
      setAllCareerRecs(await res.json())
    } catch (err: any) {
      setAllCareerRecsError(err.message)
    } finally {
      setAllCareerRecsLoading(false)
    }
  }, [])

  const fetchCareersCatalog = useCallback(async () => {
    setCareersCatalogLoading(true)
    setCareersCatalogError('')
    try {
      const res = await fetch('/api/admin/careers')
      if (!res.ok) throw new Error('Failed to load career catalog')
      setCareersCatalog(await res.json())
    } catch (err: any) {
      setCareersCatalogError(err.message)
    } finally {
      setCareersCatalogLoading(false)
    }
  }, [])

  async function setCareerApproval(id: string, is_approved: boolean) {
    setCareersCatalog(prev => prev.map(c => c.id === id ? { ...c, is_approved } : c))
    try {
      const res = await fetch(`/api/admin/careers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_approved }),
      })
      if (!res.ok) throw new Error('failed')
    } catch {
      fetchCareersCatalog() // best-effort optimistic update — resync on failure
    }
  }

  const fetchTelemetry = useCallback(async () => {
    setTelemetryLoading(true)
    setTelemetryError('')
    try {
      const res = await fetch('/api/admin/telemetry-events')
      if (!res.ok) throw new Error('Failed to load behavior telemetry')
      setTelemetryList(await res.json())
    } catch (err: any) {
      setTelemetryError(err.message)
    } finally {
      setTelemetryLoading(false)
    }
  }, [])

  const fetchBugReports = useCallback(async () => {
    setBugReportsLoading(true)
    setBugReportsError('')
    try {
      const res = await fetch('/api/admin/bug-reports')
      if (!res.ok) throw new Error('Failed to load bug reports')
      setBugReports(await res.json())
    } catch (err: any) {
      setBugReportsError(err.message)
    } finally {
      setBugReportsLoading(false)
    }
  }, [])

  async function setBugReportStatus(id: string, status: 'open' | 'resolved') {
    setBugReports(prev => prev.map(b => b.id === id ? { ...b, status } : b))
    setSelectedBugReport(prev => prev && prev.id === id ? { ...prev, status } : prev)
    try {
      const res = await fetch(`/api/admin/bug-reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('failed')
    } catch {
      fetchBugReports() // best-effort optimistic update — resync on failure
    }
  }

  const fetchWaitlist = useCallback(async () => {
    setWaitlistLoading(true)
    setWaitlistError('')
    try {
      const res = await fetch('/api/admin/waitlist')
      if (!res.ok) throw new Error('Failed to load waitlist')
      setWaitlistList(await res.json())
    } catch (err: any) {
      setWaitlistError(err.message)
    } finally {
      setWaitlistLoading(false)
    }
  }, [])

  const fetchDashboardStats = useCallback(async () => {
    setDashboardLoading(true)
    setDashboardError('')
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch('/api/admin/dashboard-stats')
        if (!res.ok) throw new Error('Failed to load dashboard stats')
        setDashboardStats(await res.json())
        setDashboardLoading(false)
        return
      } catch (err: any) {
        if (attempt === 0) { await new Promise(r => setTimeout(r, 1200)); continue }
        setDashboardError(err.message)
      }
    }
    setDashboardLoading(false)
  }, [])

  const fetchShareToken = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/dashboard-share-link')
      if (!res.ok) return
      const data = await res.json()
      setShareToken(data.token || '')
    } catch {
      // non-critical — the copy-link box just won't render
    }
  }, [])

  async function handleRegenerateShareLink() {
    if (!confirm('Regenerate the share link? The old link will stop working immediately.')) return
    setRegeneratingShareLink(true)
    try {
      const res = await fetch('/api/admin/dashboard-share-link', { method: 'POST' })
      if (!res.ok) { alert('Failed to regenerate share link'); return }
      const data = await res.json()
      setShareToken(data.token || '')
    } catch {
      alert('Failed to regenerate share link')
    } finally {
      setRegeneratingShareLink(false)
    }
  }

  const fetchOnetLinks = useCallback(async () => {
    setOnetLoading(true)
    setOnetError('')
    try {
      const res = await fetch('/api/admin/onet')
      if (!res.ok) throw new Error('Failed to load O*NET links')
      setOnetLinks(await res.json())
    } catch (err: any) {
      setOnetError(err.message)
    } finally {
      setOnetLoading(false)
    }
  }, [])

  const fetchCountryProfiles = useCallback(async () => {
    setCountryLoading(true)
    setCountryError('')
    try {
      const res = await fetch('/api/admin/country-profiles')
      if (!res.ok) throw new Error('Failed to load')
      setCountryProfiles(await res.json())
    } catch (err: any) {
      setCountryError(err.message)
    } finally {
      setCountryLoading(false)
    }
  }, [])

  const fetchCoachingSessions = useCallback(async () => {
    setCoachingLoading(true)
    setCoachingError('')
    try {
      const res = await fetch('/api/admin/coaching-sessions')
      if (!res.ok) throw new Error('Failed to load coaching sessions')
      setCoachingSessions(await res.json())
    } catch (err: any) {
      setCoachingError(err.message)
    } finally {
      setCoachingLoading(false)
    }
  }, [])

  const fetchCourses = useCallback(async () => {
    setCoursesLoading(true)
    setCoursesError('')
    try {
      const res = await fetch('/api/admin/courses')
      if (!res.ok) throw new Error('Failed to load courses')
      setCourses(await res.json())
    } catch (err: any) {
      setCoursesError(err.message)
    } finally {
      setCoursesLoading(false)
    }
  }, [])

  const fetchTestMode = useCallback(async () => {
    setTestModeLoading(true)
    setTestModeError('')
    try {
      const res = await fetch('/api/admin/test-mode')
      if (!res.ok) throw new Error('Failed to load test mode')
      setTestModeEnabled((await res.json()).enabled)
    } catch (err: any) {
      setTestModeError(err.message)
    } finally {
      setTestModeLoading(false)
    }
  }, [])

  async function toggleTestMode(enabled: boolean) {
    setTestModeSaving(true)
    setTestModeError('')
    try {
      const res = await fetch('/api/admin/test-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      if (!res.ok) throw new Error('Failed to save test mode')
      setTestModeEnabled((await res.json()).enabled)
    } catch (err: any) {
      setTestModeError(err.message)
    } finally {
      setTestModeSaving(false)
    }
  }

  const fetchHomepageMode = useCallback(async () => {
    setHomepageModeLoading(true)
    setHomepageModeError('')
    try {
      const res = await fetch('/api/admin/homepage-mode')
      if (!res.ok) throw new Error('Failed to load homepage mode')
      setHomepageMode((await res.json()).mode)
    } catch (err: any) {
      setHomepageModeError(err.message)
    } finally {
      setHomepageModeLoading(false)
    }
  }, [])

  async function toggleHomepageMode(mode: 'landing' | 'waitlist') {
    setHomepageModeSaving(true)
    setHomepageModeError('')
    try {
      const res = await fetch('/api/admin/homepage-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      })
      if (!res.ok) throw new Error('Failed to save homepage mode')
      setHomepageMode((await res.json()).mode)
    } catch (err: any) {
      setHomepageModeError(err.message)
    } finally {
      setHomepageModeSaving(false)
    }
  }

  const fetchAiProvider = useCallback(async () => {
    setAiProviderLoading(true)
    setAiProviderError('')
    try {
      const res = await fetch('/api/admin/ai-provider')
      if (!res.ok) throw new Error('Failed to load AI provider')
      setAiProvider((await res.json()).provider)
    } catch (err: any) {
      setAiProviderError(err.message)
    } finally {
      setAiProviderLoading(false)
    }
  }, [])

  async function toggleAiProvider(provider: 'gemini' | 'claude') {
    setAiProviderSaving(true)
    setAiProviderError('')
    try {
      const res = await fetch('/api/admin/ai-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })
      if (!res.ok) throw new Error('Failed to save AI provider')
      setAiProvider((await res.json()).provider)
    } catch (err: any) {
      setAiProviderError(err.message)
    } finally {
      setAiProviderSaving(false)
    }
  }

  const fetchMarketTrends = useCallback(async () => {
    setMarketLoading(true)
    setMarketError('')
    try {
      const res = await fetch('/api/admin/market-analysis/trends')
      if (!res.ok) throw new Error('Failed to load market trends')
      setMarketTrends(await res.json())
    } catch (err: any) {
      setMarketError(err.message)
    } finally {
      setMarketLoading(false)
    }
  }, [])

  async function triggerMarketFetch() {
    setMarketFetching(true)
    setMarketFetchResult(null)
    try {
      const startRes = await fetch('/api/admin/market-analysis/fetch', { method: 'POST' })
      const startText = await startRes.text()
      const startData = startText ? JSON.parse(startText) : { error: 'Empty response from server' }
      if (startData.error) {
        setMarketFetchResult(startData)
        return
      }

      for (let i = 0; i < 90; i++) { // poll for up to ~15 minutes (6 countries x 25 roles x 2 sources can take a while)
        await new Promise(r => setTimeout(r, 10000))
        const statusRes = await fetch('/api/admin/market-analysis/fetch-status')
        const statusText = await statusRes.text()
        let status: any
        try {
          status = statusText ? JSON.parse(statusText) : { error: 'Empty response from server' }
        } catch {
          setMarketFetchResult({ error: `Server returned a non-JSON response (likely a gateway timeout): ${statusText.slice(0, 100)}` })
          return
        }
        if (status.status === 'done') {
          setMarketFetchResult(status)
          fetchMarketTrends()
          return
        }
      }
      setMarketFetchResult({ error: 'Still running in the background — refresh in a few minutes to see results' })
    } catch (err: any) {
      setMarketFetchResult({ error: err.message })
    } finally {
      setMarketFetching(false)
    }
  }

  useEffect(() => {
    if (authed) {
      fetchDashboardStats()
      fetchShareToken()
      fetchSubmissions()
      fetchOnetLinks()
      fetchFeedback()
      fetchBetaFeedback()
      fetchAllCareerRecs()
      fetchCareersCatalog()
      fetchTelemetry()
      fetchBugReports()
      fetchWaitlist()
      fetchCoachingSessions()
      fetchCountryProfiles()
      fetchCourses()
      fetchMarketTrends()
      fetchTestMode()
      fetchHomepageMode()
      fetchAiProvider()
    }
  }, [authed, fetchDashboardStats, fetchShareToken, fetchSubmissions, fetchOnetLinks, fetchFeedback, fetchBetaFeedback, fetchAllCareerRecs, fetchCareersCatalog, fetchTelemetry, fetchBugReports, fetchWaitlist, fetchCoachingSessions, fetchCountryProfiles, fetchCourses, fetchMarketTrends, fetchTestMode, fetchHomepageMode, fetchAiProvider])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoggingIn(true)
    setLoginError('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error || !data.session) {
        setLoginError('Invalid credentials')
        return
      }
      const sessionRes = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: data.session.access_token }),
      })
      if (!sessionRes.ok) {
        await supabase.auth.signOut()
        setLoginError('Not authorized as admin')
        return
      }
      setAuthed(true)
    } catch {
      setLoginError('Connection error, please try again')
    } finally {
      setLoggingIn(false)
    }
  }

  async function handleLogout() {
    await Promise.all([
      supabase.auth.signOut(),
      fetch('/api/admin/session', { method: 'DELETE' }),
    ])
    setAuthed(false)
    setSubmissions([])
    setSelected(null)
    setResults(null)
    setOnetLinks([])
    setSelectedOnet(null)
    setFeedbackList([])
    setSelectedFeedback(null)
    setBetaFeedbackList([])
    setSelectedBetaFeedback(null)
    setWaitlistList([])
    setCoachingSessions([])
  }

  // Shared by handleViewResults (initial load) and the EN/AR toggle button in the
  // detail panel — these two sections are locale-aware, unlike the rule-based
  // career-suggestions chips and the raw scoring summary.
  function fetchLocalizedSections(subId: string, locale: 'en' | 'ar') {
    setAdminAiImpact(null)
    setAdminCareerRecs([])
    setAdminActionPlan(null)
    setAdminStudentTrack(null)
    setAdminCertifications(null)
    setAdminCareerPath(null)
    setAdminAiLoading(true)
    setAdminCareerRecsLoading(true)
    fetch(`/api/admin/submissions/${subId}/ai-impact?locale=${locale}`)
      .then(r => r.json()).then(d => setAdminAiImpact(d)).catch(() => {}).finally(() => setAdminAiLoading(false))
    // AI-generated career_recommendations (match_score/fit_summary/growth_note/fit_tag/
    // direction_tag) and the 90-day action_plan shown to the user in-app / in the PDF —
    // surfaced here so an admin can spot-check the actual reasoning text a real user
    // saw, not just the rule-based title list above.
    fetch(`/api/admin/submissions/${subId}/career-recommendations?locale=${locale}`)
      .then(r => r.json()).then(d => { setAdminCareerRecs(d.career_recommendations || []); setAdminActionPlan(d.action_plan || null) })
      .catch(() => {}).finally(() => setAdminCareerRecsLoading(false))
    // The three practical tracks (students/entering-market/professionals) — each
    // request returns {} for a submission not in that stage, so at most one of
    // these three ever has content for a given person.
    fetch(`/api/admin/submissions/${subId}/student-track?locale=${locale}`)
      .then(r => r.json()).then(d => { if (d?.majors_guidance || d?.exposure_ideas?.length) setAdminStudentTrack(d) }).catch(() => {})
    fetch(`/api/admin/submissions/${subId}/certifications?locale=${locale}`)
      .then(r => r.json()).then(d => { if (d?.certifications?.length) setAdminCertifications(d) }).catch(() => {})
    fetch(`/api/admin/submissions/${subId}/career-path?locale=${locale}`)
      .then(r => r.json()).then(d => { if (d?.narrative) setAdminCareerPath(d) }).catch(() => {})
  }

  async function handleViewResults(sub: Submission) {
    setSelected(sub)
    setResults(null)
    setAdminJobs([])
    setAdminJobListings([])
    setAdminCompanies([])
    setAdminCourses([])
    setAdminReportError('')
    setAdminAnswers({})
    setResultsLoading(true)
    let locale: 'en' | 'ar' = 'en'
    try {
      const res = await fetch(`/api/admin/submissions/${sub.id}/results`)
      const data = await res.json()
      setResults(data.summary)
      // Default the toggle to whatever locale the user actually submitted/viewed in,
      // rather than always opening on English.
      if (data.locale === 'ar' || data.locale === 'en') locale = data.locale
    } catch {
      setResults(null)
    } finally {
      setResultsLoading(false)
    }
    setAdminReportLocale(locale)
    fetch(`/api/admin/submissions/${sub.id}/career-suggestions`)
      .then(r => r.json()).then(d => setAdminJobs(d.suggestions || [])).catch(() => {})
    fetchLocalizedSections(sub.id, locale)
    setAdminAnswersLoading(true)
    fetch(`/api/admin/submissions/${sub.id}/answers`)
      .then(r => r.json()).then(d => setAdminAnswers(d.answers || {})).catch(() => {}).finally(() => setAdminAnswersLoading(false))
    // Job listings/companies/courses aren't locale-specific text, just tier-gated
    // lookups — fetch once per submission rather than on every EN/AR toggle.
    setAdminJobListingsLoading(true)
    fetch(`/api/admin/submissions/${sub.id}/job-listings`)
      .then(r => r.json()).then(d => setAdminJobListings(d.jobs || [])).catch(() => {}).finally(() => setAdminJobListingsLoading(false))
    setAdminCompaniesLoading(true)
    fetch(`/api/admin/submissions/${sub.id}/companies`)
      .then(r => r.json()).then(d => setAdminCompanies(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setAdminCompaniesLoading(false))
    setAdminCoursesLoading(true)
    fetch(`/api/admin/submissions/${sub.id}/courses`)
      .then(r => r.json()).then(d => setAdminCourses(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setAdminCoursesLoading(false))
  }

  async function handleDeleteSubmission(id: string) {
    if (!confirm('Delete this submission and all its data?')) return
    const res = await fetch(`/api/admin/submissions/${id}`, { method: 'DELETE' })
    if (!res.ok) { alert('Failed to delete submission'); return }
    setSubmissions(prev => prev.filter(s => s.id !== id))
  }

  async function handleAddOnet(e: React.FormEvent) {
    e.preventDefault()
    setOnetAdding(true)
    try {
      const res = await fetch('/api/admin/onet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: onetEmail, onet_url: onetUrl, label: onetLabel || null }),
      })
      if (!res.ok) throw new Error('Failed to add')
      setOnetEmail('')
      setOnetUrl('')
      setOnetLabel('')
      await fetchOnetLinks()
    } catch (err: any) {
      setOnetError(err.message)
    } finally {
      setOnetAdding(false)
    }
  }

  async function handleDeleteOnet(id: string) {
    try {
      const res = await fetch(`/api/admin/onet/${id}`, { method: 'DELETE' })
      if (!res.ok) { alert('Failed to delete O*NET link'); return }
      setOnetLinks(prev => prev.filter(l => l.id !== id))
      if (selectedOnet?.id === id) setSelectedOnet(null)
    } catch {
      alert('Failed to delete O*NET link')
    }
  }

  async function handleLoadComparison(sub: Submission) {
    setShowComparison(true)
    setComparisonLoading(true)
    setComparisonResults(null)
    try {
      const res  = await fetch(`/api/admin/submissions/${sub.id}/results`)
      const data = await res.json()
      setComparisonResults(data.summary)
    } catch { /* stay null */ }
    finally { setComparisonLoading(false) }
  }

  async function handleSaveCountry(e: React.FormEvent) {
    e.preventDefault()
    const payload: any = { ...countryForm }
    if (editingCountry) {
      await fetch(`/api/admin/country-profiles/${editingCountry.country_code}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
    } else {
      await fetch('/api/admin/country-profiles', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
    }
    setShowCountryForm(false)
    setEditingCountry(null)
    setCountryForm({})
    fetchCountryProfiles()
  }

  async function handleDeleteCountry(code: string){
    if (!confirm('Delete this country profile?')) return
    const res = await fetch(`/api/admin/country-profiles/${code}`, { method: 'DELETE' })
    if (!res.ok) { alert('Failed to delete country profile'); return }
    setCountryProfiles(prev => prev.filter(c => c.country_code !== code))
  }

  async function handleAddCoachingSession(e: React.FormEvent) {
    e.preventDefault()
    setCoachingSubmitting(true)
    setCoachingError('')
    setCoachingSuccess('')
    try {
      const res = await fetch('/api/admin/coaching-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_label: coachingForm.client_label || null,
          topic: coachingForm.topic || null,
          session_date: coachingForm.session_date || null,
          raw_transcript: coachingForm.raw_transcript,
        }),
      })
      if (!res.ok) throw new Error('Failed to process transcript')
      const data = await res.json()
      setCoachingSuccess(`Processed — ${data.chunks_created} coaching beats extracted.`)
      setCoachingForm({ client_label: '', topic: '', session_date: '', raw_transcript: '' })
      fetchCoachingSessions()
    } catch (err: any) {
      setCoachingError(err.message)
    } finally {
      setCoachingSubmitting(false)
    }
  }

  async function handleAddCourse(e: React.FormEvent) {
    e.preventDefault()
    setCourseAdding(true)
    setCoursesError('')
    try {
      const payload = {
        ...courseForm,
        skill_tags:  courseForm.skill_tags.split(',').map(s => s.trim()).filter(Boolean),
        career_tags: courseForm.career_tags.split(',').map(s => s.trim()).filter(Boolean),
        riasec_tags: courseForm.riasec_tags.split(',').map(s => s.trim()).filter(Boolean),
        duration_hours: courseForm.duration_hours ? parseInt(courseForm.duration_hours) : null,
        country_code: courseForm.country_code.trim().toUpperCase() || null,
      }
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to add course')
      setCourseForm({ title: '', provider: '', url: '', description: '', skill_tags: '', career_tags: '', riasec_tags: '', is_free: false, level: 'beginner', duration_hours: '', language: 'en', country_code: '' })
      setShowCourseForm(false)
      fetchCourses()
    } catch (err: any) {
      setCoursesError(err.message)
    } finally {
      setCourseAdding(false)
    }
  }

  async function handleDeleteCourse(id: string) {
    if (!confirm('Delete this course?')) return
    const res = await fetch(`/api/admin/courses/${id}`, { method: 'DELETE' })
    if (!res.ok) { alert('Failed to delete course'); return }
    setCourses(prev => prev.filter(c => c.id !== id))
  }

  const onetLinkForEmail = (email: string) =>
    onetLinks.find(l => l.email.toLowerCase() === email?.toLowerCase())

  // ── Login ──────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen brand-surface flex items-center justify-center px-4">
        <div className="card p-8 w-full max-w-sm">
          <div className="mb-6 flex items-center gap-3">
            <Logomark size={34} />
            <div>
              <h1 className="text-xl font-extrabold text-charcoal leading-none">Admin Panel</h1>
              <p className="text-xs text-charcoal/40 mt-1">Etijahi · إتجاهي</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-10 text-sm bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full bg-primary hover:bg-primary-deep disabled:opacity-60 text-white font-semibold py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loggingIn && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {loggingIn ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Results detail panel ──────────────────────────────
  if (selected) {
    const onet = onetLinkForEmail(selected.email)
    return (
      <div className="min-h-screen brand-surface">
        <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setSelected(null); setResults(null) }}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              ← Back
            </button>
            <div>
              <h2 className="font-semibold text-slate-800">{selected.full_name}</h2>
              <p className="text-xs text-slate-400">{selected.email} · {selected.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(() => {
              const feedback = betaFeedbackList.find(bf => bf.response_id === selected.id)
              if (!feedback) return null
              return (
                <button
                  onClick={() => { setSelected(null); setResults(null); setSelectedBetaFeedback(feedback) }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--line-strong)] bg-white text-fuchsia-700 hover:bg-fuchsia-50 hover:border-fuchsia-300 text-sm font-medium transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-6l-4 4v-4z" />
                  </svg>
                  View Feedback{feedback.stage2_completed_at ? '' : ' (partial)'}
                </button>
              )
            })()}
            <div className="flex items-center rounded-lg border border-[var(--line-strong)] bg-white overflow-hidden text-sm font-medium">
              {(['en', 'ar'] as const).map(loc => (
                <button
                  key={loc}
                  onClick={() => {
                    if (adminReportLocale === loc) return
                    setAdminReportLocale(loc)
                    fetchLocalizedSections(selected.id, loc)
                  }}
                  className={`px-3 py-2 transition-colors duration-150 ${
                    adminReportLocale === loc ? 'bg-primary text-white' : 'text-slate-500 hover:bg-lightblue'
                  }`}
                >
                  {loc.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={async () => {
                setAdminReportError('')
                setAdminReportDownloading(true)
                try {
                  const res = await fetch(`/api/admin/submissions/${selected.id}/report?locale=${adminReportLocale}`)
                  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || `Failed (${res.status})`)
                  const blob = await res.blob()
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `career-report-${selected.id.slice(0, 8)}-${adminReportLocale}.pdf`
                  a.click()
                  URL.revokeObjectURL(url)
                } catch (e: any) {
                  setAdminReportError(e.message || 'Failed to download report')
                } finally {
                  setAdminReportDownloading(false)
                }
              }}
              disabled={adminReportDownloading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--line-strong)] bg-white text-primary hover:bg-lightblue hover:border-primary text-sm font-medium transition-all duration-200 disabled:opacity-50"
            >
              {adminReportDownloading ? (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
                </svg>
              )}
              {adminReportDownloading ? 'Generating…' : 'Download Report'}
            </button>
            <button
              onClick={() => {
                const url = `${window.location.origin}/${adminReportLocale}/results/${selected.id}`
                navigator.clipboard.writeText(url)
                setLinkCopied(true)
                if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
                copyTimerRef.current = setTimeout(() => setLinkCopied(false), 2000)
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200 ${
                linkCopied
                  ? 'border-green-300 bg-green-50 text-green-700'
                  : 'border-[var(--line-strong)] bg-white text-primary hover:bg-lightblue hover:border-primary'
              }`}
            >
              {linkCopied ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-4 10h6a2 2 0 002-2v-8a2 2 0 00-2-2h-6a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Results Link
                </>
              )}
            </button>
          </div>
        </div>
        {adminReportError && (
          <div className="max-w-[1700px] mx-auto px-6 pt-4">
            <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{adminReportError}</p>
          </div>
        )}

        <div className="max-w-[1700px] mx-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">

            {/* Answers side — sticky and independently scrollable, so lining it up
                against a result on the right never means scrolling back up. */}
            <div className="space-y-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pr-1">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">Profile</h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {[
                    ['Name', selected.full_name],
                    ['Email', selected.email],
                    ['Phone', selected.phone],
                    ['Country', selected.country],
                    ['Nationality', selected.nationality],
                    ['Age', selected.age ?? (selected.age_bracket ? AGE_BRACKET_LABEL[selected.age_bracket] || selected.age_bracket : null)],
                    ['Experience', selected.experience_level ? (EXPERIENCE_LEVEL_LABEL[selected.experience_level] || selected.experience_level) : null],
                    ['Education field', (selected.education_field || []).join(', ')],
                    ['Major was own choice', selected.major_was_own_choice === 'no'
                      ? `No${selected.major_choice_reason ? ` — ${selected.major_choice_reason}` : ''}`
                      : selected.major_was_own_choice === 'yes' ? 'Yes' : null],
                    ['Career direction', selected.career_direction ? (CAREER_DIRECTION_LABEL[selected.career_direction] || selected.career_direction) : null],
                    ['Current stage', selected.current_stage],
                    ...(isBetaSubmission(selected) ? [['Cohort', cohortLabel(selected)]] : []),
                    ['Submitted', new Date(selected.created_at).toLocaleString()],
                    ['Completed', selected.completed ? 'Yes' : 'No'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-slate-400">{label}</dt>
                      <dd className="text-slate-800 font-medium">{value || '—'}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {onet && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="font-semibold text-orange-700 mb-2 text-sm uppercase tracking-wide">O*NET Assessment</h3>
                  {onet.label && <p className="text-xs text-orange-500 mb-2">{onet.label}</p>}
                  <a
                    href={onet.onet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-700 hover:underline break-all"
                  >
                    {onet.onet_url}
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-700 mb-1 text-sm uppercase tracking-wide">
                  Answers{adminAnswersLoading ? ' (loading…)' : ` (${Object.keys(adminAnswers).length})`}
                </h3>
                <p className="text-xs text-slate-400 mb-4">Every question this person actually answered, in assessment order.</p>
                {adminAnswersLoading ? (
                  <p className="text-sm text-slate-400">Loading answers…</p>
                ) : Object.keys(adminAnswers).length === 0 ? (
                  <p className="text-sm text-slate-400">No stored answers for this submission.</p>
                ) : (
                  <div className="space-y-5">
                    {Object.entries(
                      questions
                        .filter(q => q.framework !== 'Details' && q.id in adminAnswers)
                        .reduce((sections, q) => {
                          (sections[q.section] ||= []).push(q)
                          return sections
                        }, {} as Record<string, Question[]>)
                    ).map(([section, qs]) => (
                      <div key={section}>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{section}</h4>
                        <dl className="space-y-2.5">
                          {qs.map(q => (
                            <div key={q.id} className="text-sm">
                              <dt className="text-slate-500">{q.text}</dt>
                              <dd className="text-slate-800 font-medium">{formatAnswer(q, adminAnswers[q.id])}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Results side — everything derived from the answers on the left. */}
            <div className="min-w-0 space-y-4">
              {resultsLoading && (
                <div className="flex justify-center py-8">
                  <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {results && (
                <>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {results.dimension_scores?.riasec && (
                      <DimensionBarChart
                        title="Career Types (RIASEC)"
                        scores={results.dimension_scores.riasec}
                        barColor="bg-primary"
                        badgeClass="bg-lightblue text-primary"
                      />
                    )}
                    {results.dimension_scores?.values && (
                      <DimensionBarChart
                        title="Core Values"
                        scores={results.dimension_scores.values}
                        barColor="bg-amber-500"
                        badgeClass="bg-amber-50 text-amber-700"
                      />
                    )}
                    {results.dimension_scores?.strengths && (
                      <DimensionBarChart
                        title="Top Strengths"
                        scores={results.dimension_scores.strengths}
                        barColor="bg-purple-600"
                        badgeClass="bg-purple-50 text-purple-700"
                      />
                    )}
                    {results.dimension_scores?.big_five && (
                      <DimensionBarChart
                        title="Personality (Big Five)"
                        scores={results.dimension_scores.big_five}
                        labels={results.big_five}
                        barColor="bg-indigo-500"
                        badgeClass="bg-indigo-50 text-indigo-600"
                      />
                    )}
                  </div>

                  {results.work_style && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                      <h3 className="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wide">Work Style & Resilience</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                        {[
                          { label: 'Pace', low: 'Steady', high: 'Fast-paced', score: results.work_style.pace },
                          { label: 'Environment', low: 'Large org', high: 'Startup', score: results.work_style.environment },
                          { label: 'Sector', low: 'Public', high: 'Private', score: results.work_style.sector },
                          { label: 'Mobility', low: 'Local', high: 'Open to relocate', score: results.work_style.mobility },
                          ...(results.resilience ? [
                            { label: 'Long-term focus', low: 'Short-term', high: 'Long-term', score: results.resilience.long_term_focus },
                            { label: 'Resilience', low: 'Needs support', high: 'Bounces back', score: results.resilience.workplace_resilience },
                          ] : []),
                        ].map(({ label, low, high, score }) => (
                          <div key={label}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-medium text-slate-500">{label}</span>
                              <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">{score >= 50 ? high : low}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                              <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${score}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {adminJobs.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">Suggested Careers</h3>
                    <div className="flex gap-2 flex-wrap">
                      {adminJobs.map((job: any, i: number) => (
                        <span key={job.title} className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize ${i === 0 ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                          {job.title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {adminCareerRecsLoading && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-pulse">
                    <div className="h-4 bg-slate-100 rounded w-1/3 mb-4" />
                    <div className="space-y-3">
                      {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}
                    </div>
                  </div>
                )}

                {!adminCareerRecsLoading && adminCareerRecs.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <h3 className="font-semibold text-slate-700 mb-1 text-sm uppercase tracking-wide">AI Career Recommendations</h3>
                    <p className="text-xs text-slate-400 mb-3">Exact match_score/fit_summary/growth_note/fit_tag/direction_tag shown to this user — review for accuracy and appropriateness.</p>
                    <div className="space-y-3">
                      {adminCareerRecs.map((c: any, i: number) => (
                        <div key={c.title ?? i} className="border border-slate-100 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-semibold text-slate-800">{c.title}</span>
                            {typeof c.match_score === 'number' && (
                              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700">{c.match_score}% match</span>
                            )}
                          </div>
                          {c.sector && <p className="text-xs text-slate-400 mb-1.5">{c.sector}</p>}
                          {(c.fit_tag || c.direction_tag) && (
                            <div className="flex flex-wrap gap-1.5 mb-1.5">
                              {c.fit_tag && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 capitalize">{formatUnderscored(c.fit_tag)}</span>}
                              {c.direction_tag && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-slate-200 text-slate-500 capitalize">{formatUnderscored(c.direction_tag)}</span>}
                            </div>
                          )}
                          {c.fit_summary && <p className="text-xs text-slate-600 mb-1.5">{c.fit_summary}</p>}
                          {c.growth_note && <p className="text-xs text-slate-500 italic">{c.growth_note}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {adminAiLoading && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-pulse">
                    <div className="h-4 bg-slate-100 rounded w-1/3 mb-4" />
                    <div className="space-y-3">
                      {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}
                    </div>
                  </div>
                )}

                {!adminAiLoading && adminAiImpact && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">AI Impact on Careers</h3>
                    <p className="text-sm text-slate-600 mb-4 leading-relaxed">{adminAiImpact.overall_summary}</p>
                    <div className="space-y-3">
                      {adminAiImpact.careers?.map((c: any) => (
                        <div key={c.title} className="border border-slate-100 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-slate-800">{c.title}</span>
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                              c.ai_risk_level === 'low' ? 'bg-green-50 text-green-700' :
                              c.ai_risk_level === 'medium' ? 'bg-amber-50 text-amber-700' :
                              'bg-rose-50 text-rose-700'
                            }`}>{c.ai_risk_level?.toUpperCase()} RISK</span>
                          </div>
                          <p className="text-xs text-slate-500 mb-2">{c.gcc_outlook}</p>
                          {c.protected_skills?.length > 0 && (
                            <div className="mb-2">
                              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Human skills that stay valuable</p>
                              <div className="flex flex-wrap gap-1.5">
                                {c.protected_skills.map((s: string) => (
                                  <span key={s} className="text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full">{s}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {c.upskilling?.length > 0 && <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">How to prepare</p>}
                          <ul className="space-y-1">
                            {c.upskilling?.map((tip: string) => (
                              <li key={tip} className="text-xs text-slate-500 flex gap-1.5">
                                <span className="text-primary/70 mt-0.5">→</span>{tip}
                              </li>
                            ))}
                          </ul>
                          {c.what_this_means_for_you && (
                            <p className="text-xs font-semibold text-slate-600 mt-2 pl-2 border-l-2 border-teal-400">
                              What this means for you: <span className="font-normal">{c.what_this_means_for_you}</span>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!adminCareerRecsLoading && adminActionPlan && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <h3 className="font-semibold text-slate-700 mb-1 text-sm uppercase tracking-wide">90-Day Action Plan</h3>
                    <p className="text-xs text-slate-400 mb-3">Also shown on the user's live results page and in the downloaded PDF.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        ['Month 1', adminActionPlan.month_1],
                        ['Months 2-3', adminActionPlan.months_2_3],
                        ['Months 4-6', adminActionPlan.months_4_6],
                      ].map(([label, items]) => (
                        <div key={label as string}>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{label}</p>
                          <ul className="space-y-1.5">
                            {((items as string[]) || []).map((item, i) => (
                              <li key={i} className="text-xs text-slate-600 flex gap-1.5">
                                <span className="text-primary/70 mt-0.5">→</span>{item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!adminCareerRecsLoading && adminStudentTrack && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <h3 className="font-semibold text-slate-700 mb-1 text-sm uppercase tracking-wide">Majors &amp; Exposure</h3>
                    <p className="text-xs text-slate-400 mb-3">Students' practical track — also shown on the live results page and in the PDF.</p>
                    {adminStudentTrack.majors_guidance && <p className="text-sm text-slate-600 mb-3">{adminStudentTrack.majors_guidance}</p>}
                    <div className="space-y-2">
                      {(adminStudentTrack.exposure_ideas || []).map((idea: any, i: number) => (
                        <div key={i} className="border border-slate-100 rounded-xl p-3">
                          <p className="text-sm font-semibold text-slate-800">{idea.title}</p>
                          {idea.why && <p className="text-xs text-slate-500 mt-0.5">{idea.why}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!adminCareerRecsLoading && adminCertifications && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <h3 className="font-semibold text-slate-700 mb-1 text-sm uppercase tracking-wide">Certifications to Pursue</h3>
                    <p className="text-xs text-slate-400 mb-3">"Entering the market" practical track — also shown on the live results page and in the PDF.</p>
                    <div className="space-y-2">
                      {(adminCertifications.certifications || []).map((cert: any, i: number) => (
                        <div key={i} className="border border-slate-100 rounded-xl p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-800">{cert.title}</p>
                            {cert.provider_type && <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{cert.provider_type}</span>}
                          </div>
                          {cert.why && <p className="text-xs text-slate-500 mt-0.5">{cert.why}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!adminCareerRecsLoading && adminCareerPath && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <h3 className="font-semibold text-slate-700 mb-1 text-sm uppercase tracking-wide">
                      Your Path Forward {adminCareerPath.path_type && <span className="text-xs font-normal text-slate-400 capitalize">({formatUnderscored(adminCareerPath.path_type)})</span>}
                    </h3>
                    <p className="text-xs text-slate-400 mb-3">Working professionals' practical track — also shown on the live results page and in the PDF.</p>
                    <p className="text-sm text-slate-600 mb-2">{adminCareerPath.narrative}</p>
                    <ul className="space-y-1">
                      {(adminCareerPath.next_steps || []).map((step: string, i: number) => (
                        <li key={i} className="text-xs text-slate-500 flex gap-1.5">
                          <span className="text-primary/70 mt-0.5">→</span>{step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {adminJobListingsLoading && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-pulse">
                    <div className="h-4 bg-slate-100 rounded w-1/3 mb-4" />
                    <div className="space-y-3">
                      {[1,2].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}
                    </div>
                  </div>
                )}
                {!adminJobListingsLoading && adminJobListings.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">
                      {adminJobListings[0]?.is_internship ? 'Internship Postings' : 'Live Job Postings'} ({adminJobListings.length})
                    </h3>
                    <div className="space-y-2">
                      {adminJobListings.map((job: any, i: number) => (
                        <a key={i} href={job.url} target="_blank" rel="noopener noreferrer" className="flex items-start justify-between gap-3 border border-slate-100 rounded-xl p-3 hover:border-slate-300 transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{job.title}</p>
                            <p className="text-xs text-slate-400 truncate">{job.company} · {job.location}</p>
                            {job.matched_career && <p className="text-xs text-slate-400 mt-0.5">For: {job.matched_career}</p>}
                          </div>
                          {job.source && <span className="text-xs shrink-0 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100 text-slate-500">{job.source}</span>}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {adminCompaniesLoading && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-pulse">
                    <div className="h-4 bg-slate-100 rounded w-1/3 mb-4" />
                    <div className="space-y-3">
                      {[1,2].map(i => <div key={i} className="h-12 bg-slate-100 rounded-xl" />)}
                    </div>
                  </div>
                )}
                {!adminCompaniesLoading && adminCompanies.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">Recommended Companies ({adminCompanies.length})</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {adminCompanies.map((company: any) => (
                        <a key={company.id} href={company.career_page_url || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 border border-slate-100 rounded-xl p-3 hover:border-slate-300 transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{company.name_en}</p>
                            <p className="text-xs text-slate-400 truncate">{company.sector}{company.is_government ? ' · Government' : ''}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {adminCoursesLoading && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-pulse">
                    <div className="h-4 bg-slate-100 rounded w-1/3 mb-4" />
                    <div className="space-y-3">
                      {[1,2].map(i => <div key={i} className="h-12 bg-slate-100 rounded-xl" />)}
                    </div>
                  </div>
                )}
                {!adminCoursesLoading && adminCourses.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">Recommended Courses ({adminCourses.length})</h3>
                    <div className="space-y-2">
                      {adminCourses.map((course: any) => (
                        <a key={course.id} href={course.url} target="_blank" rel="noopener noreferrer" className="flex items-start justify-between gap-3 border border-slate-100 rounded-xl p-3 hover:border-slate-300 transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{course.title}</p>
                            <p className="text-xs text-slate-400 truncate">{course.provider} · {course.level}{course.duration_hours ? ` · ${course.duration_hours}h` : ''}</p>
                          </div>
                          <span className={`text-xs shrink-0 px-2 py-0.5 rounded-full border ${course.is_free ? 'bg-teal-50 text-teal-700 border-teal-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                            {course.is_free ? 'Free' : 'Paid'}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Feedback detail panel ─────────────────────────────
  if (selectedFeedback) {
    const fb = selectedFeedback
    const ratingLabel = (v: number | null) => v ? `${v} / 6` : '—'
    return (
      <div className="min-h-screen brand-surface">
        <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => setSelectedFeedback(null)}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            ← Back
          </button>
          <div>
            <h2 className="font-semibold text-slate-800">{fb.fname}</h2>
            <p className="text-xs text-slate-400">{fb.email}</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">About</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                ['Name', fb.fname],
                ['Email', fb.email],
                ['Age group', fb.age],
                ['Country', fb.country],
                ['Source', fb.source],
                ['Submitted', new Date(fb.created_at).toLocaleString()],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-slate-400">{label}</dt>
                  <dd className="text-slate-800 font-medium">{value || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">Accuracy</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                ['Overall accuracy', fb.accurate],
                ['Career suggestions', ratingLabel(fb.rating_careers)],
                ['Personality match', ratingLabel(fb.rating_personality)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-slate-400">{label}</dt>
                  <dd className="text-slate-800 font-medium capitalize">{value || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">Experience Ratings</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                ['Question clarity', ratingLabel(fb.rating_clarity)],
                ['Length', ratingLabel(fb.rating_length)],
                ['Overall', ratingLabel(fb.rating_overall)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-slate-400">{label}</dt>
                  <dd className="text-slate-800 font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">Reflections</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                ['Surprised by results', fb.surprised],
                ['Careers relevant', fb.careers_relevant],
                ['AI outlook changed thinking', fb.ai_outlook],
                ['Would recommend', fb.recommend],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-slate-400">{label}</dt>
                  <dd className="text-slate-800 font-medium capitalize">{value?.replace(/_/g, ' ') || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>

          {fb.other && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-700 mb-2 text-sm uppercase tracking-wide">Additional Comments</h3>
              <p className="text-sm text-slate-700 leading-relaxed">{fb.other}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Beta feedback detail panel ────────────────────────
  if (selectedBetaFeedback) {
    const bf = selectedBetaFeedback
    const ratingLabel = (v: number | null) => v ? `${v} / 6` : '—'
    return (
      <div className="min-h-screen brand-surface">
        <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => setSelectedBetaFeedback(null)}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            ← Back
          </button>
          <div>
            <h2 className="font-semibold text-slate-800">{bf.assessment_responses?.full_name || 'Unknown'}</h2>
            <p className="text-xs text-slate-400">{bf.assessment_responses?.email || '—'}</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">About</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                ['Name', bf.assessment_responses?.full_name],
                ['Email', bf.assessment_responses?.email],
                ['Country', bf.assessment_responses?.country],
                ['Status', formatUnderscored(bf.assessment_responses?.current_stage)],
                ['Cohort', cohortLabel({ created_at: bf.created_at, cohort_override: bf.assessment_responses?.cohort_override })],
                ['Age', bf.assessment_responses?.age ?? (bf.assessment_responses?.age_bracket ? AGE_BRACKET_LABEL[bf.assessment_responses.age_bracket] || bf.assessment_responses.age_bracket : null)],
                ['Experience', bf.assessment_responses?.experience_level ? (EXPERIENCE_LEVEL_LABEL[bf.assessment_responses.experience_level] || bf.assessment_responses.experience_level) : null],
                ['Locale', bf.locale || bf.assessment_responses?.locale],
                ['Device', bf.device],
                ['Stage 1 completed', bf.stage1_completed_at ? new Date(bf.stage1_completed_at).toLocaleString() : null],
                ['Result Stage completed', bf.result_stage_completed_at ? new Date(bf.result_stage_completed_at).toLocaleString() : null],
                ['Stage 2 completed', bf.stage2_completed_at ? new Date(bf.stage2_completed_at).toLocaleString() : null],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-slate-400">{label}</dt>
                  <dd className="text-slate-800 font-medium">{value || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">Stage 1 · Quick Pulse</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                ['Clarity', ratingLabel(bf.s1_clarity)],
                ['Feeling', ratingLabel(bf.s1_feeling)],
                ['Understood', ratingLabel(bf.s1_understood)],
                ['Wants from results', formatUnderscored(bf.s1_intent)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-slate-400">{label}</dt>
                  <dd className="text-slate-800 font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">Result Stage</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                ['Result accuracy', bf.result_accuracy],
                ['Would recommend', bf.would_recommend],
                ['Would pay', bf.would_pay],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-slate-400">{label}</dt>
                  <dd className="text-slate-800 font-medium capitalize">{value?.replace(/_/g, ' ') || '—'}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">Report Understanding</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                ['Understood after', bf.understood_after ? `${bf.understood_after} / 5` : '—'],
                ['Felt like a coach?', bf.felt_like_mentor ? formatUnderscored(bf.felt_like_mentor) : '—'],
                ['Careers seriously considered', bf.careers_seriously_considered ? (CAREERS_CONSIDERED_LABEL[bf.careers_seriously_considered] || bf.careers_seriously_considered) : '—'],
                ['Understood why suggested', bf.career_explained ? (CAREER_EXPLAINED_LABEL[bf.career_explained] || bf.career_explained) : '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-slate-400">{label}</dt>
                  <dd className="text-slate-800 font-medium capitalize">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">What Stood Out</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                ['Most useful part', bf.most_useful_part ? (REPORT_SECTION_LABEL[bf.most_useful_part] || bf.most_useful_part) : '—'],
                ['Least useful part', bf.least_useful_part ? (REPORT_SECTION_LABEL[bf.least_useful_part] || bf.least_useful_part) : '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-slate-400">{label}</dt>
                  <dd className="text-slate-800 font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">Value &amp; Pricing</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                ['Would pay (at price)', bf.would_pay_at_price ? (WOULD_PAY_AT_PRICE_LABEL[bf.would_pay_at_price] || bf.would_pay_at_price) : '—'],
                ['Top pay blocker', bf.pay_blocker_priority ? (PAY_BLOCKER_LABEL[bf.pay_blocker_priority] || bf.pay_blocker_priority) : '—'],
                ['Wants coach session', bf.wants_coach_session ? (WANTS_COACH_LABEL[bf.wants_coach_session] || bf.wants_coach_session) : '—'],
                ['Would recommend', bf.would_recommend ? formatUnderscored(bf.would_recommend) : '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-slate-400">{label}</dt>
                  <dd className="text-slate-800 font-medium capitalize">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {bf.pay_blockers && bf.pay_blockers.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-700 mb-2 text-sm uppercase tracking-wide">Pay Blockers</h3>
              <div className="flex flex-wrap gap-2">
                {bf.pay_blockers.map(blocker => (
                  <span key={blocker} className="text-xs font-medium px-2 py-1 rounded-full bg-rose-50 text-rose-700">{PAY_BLOCKER_LABEL[blocker] || formatUnderscored(blocker)}</span>
                ))}
              </div>
            </div>
          )}

          {bf.worth_paying_for && bf.worth_paying_for.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-700 mb-2 text-sm uppercase tracking-wide">Worth Paying For</h3>
              <div className="flex flex-wrap gap-2">
                {bf.worth_paying_for.map(reason => (
                  <span key={reason} className="text-xs font-medium px-2 py-1 rounded-full bg-teal-50 text-teal-700">{WORTH_PAYING_FOR_LABEL[reason] || formatUnderscored(reason)}</span>
                ))}
              </div>
            </div>
          )}

          {/* Legacy Beta 1 fields — removed from the live form, shown only for old rows that still carry them. */}
          {bf.most_valuable_parts && bf.most_valuable_parts.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-700 mb-2 text-sm uppercase tracking-wide">Most Valuable Parts (legacy)</h3>
              <div className="flex flex-wrap gap-2">
                {bf.most_valuable_parts.map(part => (
                  <span key={part} className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-600 capitalize">{part.replace(/_/g, ' ')}</span>
                ))}
              </div>
            </div>
          )}
          {(() => {
            const legacyRatings = [
              ['Personality accuracy', bf.personality_accuracy], ['Values accuracy', bf.values_accuracy],
              ['Strengths accuracy', bf.strengths_accuracy], ['Career matches accuracy', bf.career_matches_accuracy],
              ['Arabic natural', bf.arabic_natural], ['AI impact useful', ratingLabel(bf.ai_impact_useful)],
              ['AI impact credible', ratingLabel(bf.ai_impact_credible)], ['Jobs relevant', ratingLabel(bf.jobs_relevant)],
              ['Companies fit', ratingLabel(bf.companies_fit)], ['Courses useful', ratingLabel(bf.courses_useful)],
              ['Overall value', ratingLabel(bf.overall_value)], ['Would pay (legacy)', bf.would_pay],
              ['Would pay reason', bf.would_pay_reason],
            ].filter(([, v]) => v)
            return legacyRatings.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">Legacy Beta 1 Ratings</h3>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {legacyRatings.map(([label, value]) => (
                    <div key={label as string}>
                      <dt className="text-slate-400">{label}</dt>
                      <dd className="text-slate-800 font-medium capitalize">{(value as string)?.replace(/_/g, ' ') || value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )
          })()}

          {(bf.had_issues || bf.issue_detail) && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">Issues</h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-2">
                <div>
                  <dt className="text-slate-400">Had issues</dt>
                  <dd className="text-slate-800 font-medium capitalize">{bf.had_issues || '—'}</dd>
                </div>
              </dl>
              {bf.issue_detail && <p className="text-sm text-slate-700 leading-relaxed">{bf.issue_detail}</p>}
            </div>
          )}

          {[
            ['First thing they will do', bf.first_action_text],
            ['Pay blocker — other', bf.pay_blocker_other_text],
            ['Plan they would follow (legacy)', bf.plan_would_follow],
            ['Clear next step (legacy)', bf.clear_next_step],
            ['AI impact changed thinking (legacy)', bf.ai_impact_changed_thinking],
            ['Career understanding (legacy)', bf.career_understanding_text],
            ['Wrong career suggestions (legacy)', bf.wrong_career_text],
            ['Missing careers (legacy)', bf.missing_career_text],
            ['Surprised by results (legacy)', bf.surprised_text],
            ['"Not me" feedback (legacy)', bf.not_me_text],
            ['Other comments', bf.other_text],
          ].filter(([, value]) => value).map(([label, value]) => (
            <div key={label as string} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-700 mb-2 text-sm uppercase tracking-wide">{label}</h3>
              <p className="text-sm text-slate-700 leading-relaxed">{value}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── O*NET detail panel + comparison view ─────────────
  if (selectedOnet) {
    const matchedSubmission = submissions.find(
      s => s.email?.toLowerCase() === selectedOnet.email.toLowerCase()
    )
    const onetScores = decodeOnetUrl(selectedOnet.onet_url)
    const onetTypes  = onetScores ? topRiasecTypes(onetScores) : []

    // ── Comparison view ──────────────────────────────────
    if (showComparison && matchedSubmission) {
      const ourTypes = comparisonResults?.riasec?.top_types ?? []
      const { matching, onlyOurs, onlyOnet, score, verdict } = riasecAgreement(ourTypes, onetTypes)
      const scoreColor = score >= 67 ? 'text-green-700 bg-green-50' : score >= 34 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50'
      const barColor   = score >= 67 ? 'bg-green-500' : score >= 34 ? 'bg-amber-400' : 'bg-red-400'

      return (
        <div className="min-h-screen brand-surface">
          <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4">
            <button onClick={() => setShowComparison(false)} className="text-sm text-primary hover:underline flex items-center gap-1">← Back</button>
            <div>
              <h2 className="font-semibold text-slate-800">Assessment Comparison</h2>
              <p className="text-xs text-slate-400">{selectedOnet.email} · {matchedSubmission.full_name}</p>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
            {comparisonLoading && (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!comparisonLoading && (
              <>
                {/* Side-by-side columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                  {/* ── Our platform ── */}
                  <div className="space-y-4">
                    <div className="bg-primary text-white rounded-2xl px-5 py-3 text-sm font-semibold">Our Platform Assessment</div>

                    {comparisonResults ? (
                      <>
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">RIASEC Career Types</p>
                          <div className="flex gap-2 flex-wrap">
                            {ourTypes.map((t: string, i: number) => (
                              <span key={t} className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize ${i === 0 ? 'bg-primary text-white' : 'bg-lightblue text-primary border border-[var(--line)]'}`}>{t}</span>
                            ))}
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Core Values</p>
                          <div className="flex gap-2 flex-wrap">
                            {comparisonResults.values.top_values.map((v: string, i: number) => (
                              <span key={v} className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize ${i === 0 ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>{v}</span>
                            ))}
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Top Strengths</p>
                          <div className="flex gap-2 flex-wrap">
                            {comparisonResults.strengths.top_strengths.map((s: string, i: number) => (
                              <span key={s} className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize ${i === 0 ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 border border-purple-100'}`}>{s}</span>
                            ))}
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Personality (Big Five)</p>
                          <div className="space-y-3">
                            {Object.entries(comparisonResults.big_five).map(([trait, level]: any) => (
                              <div key={trait}>
                                <div className="flex justify-between items-center mb-1.5">
                                  <span className="text-sm font-medium text-slate-700 capitalize">{trait.replace(/_/g, ' ')}</span>
                                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full capitalize">{level}</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5">
                                  <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: levelToWidth[level] ?? '50%' }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="bg-white rounded-2xl p-5 border border-slate-100 text-center text-slate-400 text-sm">No platform results found.</div>
                    )}
                  </div>

                  {/* ── O*NET ── */}
                  <div className="space-y-4">
                    <div className="bg-orange-500 text-white rounded-2xl px-5 py-3 text-sm font-semibold flex items-center justify-between">
                      <span>O*NET Interest Profiler</span>
                      <a href={selectedOnet.onet_url} target="_blank" rel="noopener noreferrer" className="text-orange-100 hover:text-white">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>

                    {onetScores ? (
                      <>
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Top Career Types</p>
                          <div className="flex gap-2 flex-wrap">
                            {onetTypes.map((t, i) => (
                              <span key={t} className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize ${i === 0 ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-700 border border-orange-100'}`}>{t}</span>
                            ))}
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">All RIASEC Scores <span className="normal-case font-normal">(out of 20)</span></p>
                          <div className="space-y-3">
                            {Object.entries(onetScores).map(([trait, sc]) => (
                              <div key={trait}>
                                <div className="flex justify-between items-center mb-1.5">
                                  <span className="text-sm font-medium text-slate-700 capitalize">{trait}</span>
                                  <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{sc}/20</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5">
                                  <div className="bg-orange-400 h-1.5 rounded-full" style={{ width: `${(sc / 20) * 100}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 text-center text-orange-700 text-sm">
                        Could not decode scores from this URL.<br />
                        <a href={selectedOnet.onet_url} target="_blank" rel="noopener noreferrer" className="underline mt-1 inline-block">Open O*NET results →</a>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Agreement analysis ── */}
                {onetScores && comparisonResults && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <h3 className="font-semibold text-slate-700 mb-5 text-sm uppercase tracking-wide">Comparison Analysis</h3>

                    <div className="flex items-center gap-4 mb-4">
                      <div className={`text-3xl font-bold px-5 py-3 rounded-2xl ${scoreColor}`}>{score}%</div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">RIASEC Agreement</p>
                        <p className="text-xs text-slate-400 mt-0.5">{matching.length} of {Math.max(ourTypes.length, onetTypes.length)} top career types match across both assessments</p>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2 mb-5">
                      <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${score}%` }} />
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-5">
                      {[
                        { label: 'Both agree',        items: matching,  bg: 'bg-green-50',  text: 'text-green-700',  muted: 'text-green-400' },
                        { label: 'Only our platform', items: onlyOurs,  bg: 'bg-lightblue',   text: 'text-primary',   muted: 'text-primary/70' },
                        { label: 'Only O*NET',        items: onlyOnet,  bg: 'bg-orange-50', text: 'text-orange-700', muted: 'text-orange-400' },
                      ].map(({ label, items, bg, text, muted }) => (
                        <div key={label} className={`${bg} rounded-xl p-4`}>
                          <p className={`text-xs font-semibold ${text} uppercase tracking-wide mb-2`}>{label}</p>
                          {items.length > 0
                            ? items.map(t => <p key={t} className={`text-sm font-medium ${text} capitalize`}>{t}</p>)
                            : <p className={`text-xs ${muted}`}>None</p>}
                        </div>
                      ))}
                    </div>

                    <div className={`rounded-xl p-4 ${score >= 67 ? 'bg-green-50 border border-green-100' : score >= 34 ? 'bg-amber-50 border border-amber-100' : 'bg-red-50 border border-red-100'}`}>
                      <p className={`text-sm font-medium ${score >= 67 ? 'text-green-800' : score >= 34 ? 'text-amber-800' : 'text-red-800'}`}>{verdict}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )
    }

    // ── O*NET detail panel ───────────────────────────────
    return (
      <div className="min-h-screen brand-surface">
        <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => setSelectedOnet(null)}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            ← Back
          </button>
          <div>
            <h2 className="font-semibold text-slate-800">{selectedOnet.email}</h2>
            {selectedOnet.label && <p className="text-xs text-slate-400">{selectedOnet.label}</p>}
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-orange-700 text-sm uppercase tracking-wide">O*NET Link</h3>
              {onetScores && (
                <div className="flex gap-1 flex-wrap justify-end">
                  {onetTypes.map((t, i) => (
                    <span key={t} className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${i === 0 ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-700'}`}>{t}</span>
                  ))}
                </div>
              )}
            </div>
            <a
              href={selectedOnet.onet_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-700 hover:underline break-all"
            >
              {selectedOnet.onet_url}
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {matchedSubmission ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">Matched Assessment</h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">
                {[
                  ['Name', matchedSubmission.full_name],
                  ['Email', matchedSubmission.email],
                  ['Country', matchedSubmission.country],
                  ['Stage', matchedSubmission.current_stage?.replace(/_/g, ' ')],
                  ['Submitted', new Date(matchedSubmission.created_at).toLocaleString()],
                  ['Completed', matchedSubmission.completed ? 'Yes' : 'No'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-slate-400">{label}</dt>
                    <dd className="text-slate-800 font-medium capitalize">{value || '—'}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => { setSelectedOnet(null); handleViewResults(matchedSubmission) }}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  View full assessment results →
                </button>
                {matchedSubmission.completed && (
                  <button
                    onClick={() => handleLoadComparison(matchedSubmission)}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Compare Results
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
              <p className="text-slate-400 text-sm">No assessment submitted yet for this email.</p>
              <p className="text-slate-300 text-xs mt-1">Results will appear here once they complete the assessment.</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Behavioral telemetry, grouped from the raw event stream into one row per
  // assessment attempt — cheap enough to recompute per render at this data
  // volume (matches how the beta feedback stats above are all computed
  // client-side from the raw list, no server-side aggregation endpoint).
  const telemetrySummary = summarizeTelemetry(telemetryList)
  const {
    sessions: telemetrySessions,
    sessionCount: telemetrySessionCount,
  } = telemetrySummary
  // response_id -> session, for the Submissions table's Device/Games columns
  const telemetryByResponseId = new Map(telemetrySessions.filter(s => s.response_id).map(s => [s.response_id as string, s]))

  // Same telemetry, restricted to attempts started during the beta window —
  // feeds the Beta Testing tab's Behavior sub-tab.
  const betaSessionIds = new Set(telemetrySessions.filter(isBetaSession).map(s => s.session_id))
  const betaTelemetryEvents = telemetryList.filter(e => betaSessionIds.has(e.session_id))
  const betaTelemetrySummary = summarizeTelemetry(betaTelemetryEvents)

  const betaSubmissions = submissions.filter(isBetaSubmission)
  const betaCareerRecs = allCareerRecs.filter(isBetaSubmission)
  const betaCareerRecsGenerated = betaCareerRecs.filter(r => r.career_recommendations?.length > 0)
  const feedbackSubmittedIds = new Set(betaFeedbackList.map(bf => bf.response_id))

  const openBugCount = bugReports.filter(b => b.status === 'open').length
  const visibleBugReports = bugReports
    .filter(b => bugSourceFilter === 'all' || b.source === bugSourceFilter)
    .filter(b => bugStatusFilter === 'all' || b.status === bugStatusFilter)
  function exportBugReports() {
    const rows: (string | number | null)[][] = [
      ['Source', 'Status', 'Summary', 'Error type', 'Error message', 'Who', 'Email', 'Feature', 'Page', 'Locale', 'Device', 'Country', 'Response ID', 'Date'],
      ...visibleBugReports.map(b => [
        b.source === 'user' ? 'User report' : 'System', b.status,
        b.source === 'user' ? (b.description || '') : `${b.error_type || 'Error'}: ${b.error_message || b.description || ''}`,
        b.error_type || '', b.error_message || '', b.full_name || '', b.email || '',
        b.feature || '', b.page || '', b.locale || '', b.device_type || '', b.country || '',
        b.response_id || '', new Date(b.created_at).toLocaleString(),
      ]),
    ]
    downloadCSV(`beta_bug_reports_${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  // Shared by the general Submissions tab and the Beta Testing > Submissions
  // sub-tab — same columns, just a different (optionally pre-filtered) list.
  function renderSubmissionsTable(list: Submission[], emptyMessage: string, exportFilename: string) {
    const exportSubmissions = () => {
      const rows: (string | number | null)[][] = [
        ['Name', 'Email', 'Phone', 'Country', 'Nationality', 'Age', 'Experience', 'Education', 'Major own choice', 'Major choice reason', 'Current stage', 'Cohort', 'Date', 'Status', 'Device', 'Games played', 'Has feedback'],
        ...list.map(sub => {
          const session = telemetryByResponseId.get(sub.id)
          return [
            sub.full_name || '', sub.email || '', sub.phone || '', sub.country || '', sub.nationality || '',
            sub.age ?? (sub.age_bracket ? AGE_BRACKET_LABEL[sub.age_bracket] || sub.age_bracket : '') ?? '',
            sub.experience_level ? (EXPERIENCE_LEVEL_LABEL[sub.experience_level] || sub.experience_level) : '',
            (sub.education_field || []).join('; '),
            sub.major_was_own_choice === 'no' ? 'No' : sub.major_was_own_choice === 'yes' ? 'Yes' : '',
            sub.major_was_own_choice === 'no' ? (sub.major_choice_reason || '') : '',
            sub.current_stage || '',
            isBetaSubmission(sub) ? cohortLabel(sub) : '',
            new Date(sub.created_at).toLocaleString(),
            sub.completed ? 'Complete' : 'Incomplete',
            session?.device_type || '',
            session ? session.activities.map(kind => ACTIVITY_LABEL[kind] || kind).join('; ') : '',
            feedbackSubmittedIds.has(sub.id) ? 'Yes' : 'No',
          ]
        }),
      ]
      downloadCSV(exportFilename, rows)
    }
    return (
      <>
        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="text-sm text-slate-400">{list.length} submission{list.length !== 1 ? 's' : ''}</p>
          <DownloadCSVButton onClick={exportSubmissions} />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
          <table className="w-full text-sm min-w-[1400px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Country</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nationality</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Age</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Experience</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Education</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Stage</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Device</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Games played</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Feedback</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {list.map((sub, i) => {
                const hasOnet = !!onetLinkForEmail(sub.email)
                const hasFeedback = feedbackSubmittedIds.has(sub.id)
                const session = telemetryByResponseId.get(sub.id)
                return (
                  <tr key={sub.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                    <td className="px-3 py-3 font-medium text-slate-800">
                      <span>{sub.full_name || '—'}</span>
                      {hasOnet && (
                        <span className="ml-2 text-xs font-semibold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">O*NET</span>
                      )}
                      {isBetaSubmission(sub) && (
                        <span className="ml-2 text-xs font-semibold bg-lightblue text-primary px-1.5 py-0.5 rounded-full">
                          {cohortLabel(sub)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-slate-500">{sub.email || '—'}</div>
                      {sub.phone && <div className="text-slate-400 text-xs">{sub.phone}</div>}
                    </td>
                    <td className="px-3 py-3 text-slate-500">{sub.country || '—'}</td>
                    <td className="px-3 py-3 text-slate-500">{sub.nationality || '—'}</td>
                    <td className="px-3 py-3 text-slate-500">{sub.age ?? (sub.age_bracket ? AGE_BRACKET_LABEL[sub.age_bracket] || sub.age_bracket : null) ?? '—'}</td>
                    <td className="px-3 py-3 text-slate-500">{sub.experience_level ? (EXPERIENCE_LEVEL_LABEL[sub.experience_level] || sub.experience_level) : '—'}</td>
                    <td className="px-3 py-3 text-slate-500 capitalize">{(sub.education_field || []).map(f => f.replace(/_/g, ' ')).join(', ') || '—'}</td>
                    <td className="px-3 py-3 text-slate-500 capitalize">{sub.current_stage?.replace(/_/g, ' ') || '—'}</td>
                    <td className="px-3 py-3 text-slate-400 text-xs">{new Date(sub.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sub.completed ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-600'}`}>
                        {sub.completed ? 'Complete' : 'Incomplete'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-500 capitalize">{session?.device_type || '—'}</td>
                    <td className="px-3 py-3">
                      {session && session.activities.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {session.activities.map(kind => (
                            <span
                              key={kind}
                              className="text-xs font-medium px-1.5 py-0.5 rounded-full text-white"
                              style={{ background: ACTIVITY_COLOR[kind] || '#64748B' }}
                            >
                              {ACTIVITY_LABEL[kind] || kind}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${hasFeedback ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {hasFeedback ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-3 py-3 flex items-center gap-3">
                      <button
                        onClick={() => handleViewResults(sub)}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        View results →
                      </button>
                      <button
                        onClick={() => handleDeleteSubmission(sub.id)}
                        className="text-xs text-red-400 hover:text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-slate-400">{emptyMessage}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    )
  }

  // ── Main panel ────────────────────────────────────────
  return (
    <div className="min-h-screen brand-surface">
      <div className="bg-white border-b border-slate-100 px-6 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Logomark size={30} />
            <div>
              <h1 className="font-extrabold text-charcoal">Admin Panel</h1>
              <p className="text-xs text-charcoal/40">Etijahi · إتجاهي</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => { fetchDashboardStats(); fetchSubmissions(); fetchOnetLinks(); fetchFeedback(); fetchBetaFeedback(); fetchAllCareerRecs(); fetchCareersCatalog(); fetchTelemetry(); fetchBugReports(); fetchWaitlist(); fetchCoachingSessions(); fetchCountryProfiles(); fetchCourses(); fetchMarketTrends(); fetchTestMode() }}
              className="text-sm text-primary hover:underline"
            >
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="text-sm text-slate-400 hover:text-slate-600"
            >
              Logout
            </button>
          </div>
        </div>
        {(() => {
          const TAB_GROUPS: {
            key: 'dashboard' | 'beta' | 'content' | 'lists' | 'settings'
            label: string
            color: string
            tabs: { key: typeof activeTab; label: string; color: string; badge?: string | number; onSelect?: () => void }[]
          }[] = [
            {
              key: 'dashboard', label: 'Dashboard', color: 'bg-sky-600',
              tabs: [{ key: 'dashboard', label: 'Dashboard', color: 'bg-sky-600' }],
            },
            {
              key: 'beta', label: 'Beta Testing', color: 'bg-fuchsia-700',
              tabs: [
                { key: 'betaDashboard', label: 'Dashboard', color: 'bg-fuchsia-700' },
                { key: 'betaSubmissions', label: 'Submissions', color: 'bg-fuchsia-600', badge: betaSubmissions.length > 0 ? betaSubmissions.length : undefined },
                { key: 'betaCareerRecs', label: 'Career Recs', color: 'bg-teal-600', badge: betaCareerRecsGenerated.length > 0 ? betaCareerRecsGenerated.length : undefined },
                { key: 'betaFeedback', label: 'Feedback', color: 'bg-fuchsia-500', badge: betaFeedbackList.length > 0 ? betaFeedbackList.length : undefined },
                { key: 'betaBehavior', label: 'Behavior', color: 'bg-purple-600', badge: betaTelemetrySummary.sessionCount > 0 ? betaTelemetrySummary.sessionCount : undefined },
                { key: 'betaBugs', label: 'Bugs', color: 'bg-red-600', badge: openBugCount > 0 ? openBugCount : undefined },
              ],
            },
            {
              key: 'content', label: 'Content & AI Data', color: 'bg-violet-600',
              tabs: [
                { key: 'coaching', label: 'Coaching Sessions', color: 'bg-rose-600', badge: coachingSessions.length > 0 ? coachingSessions.length : undefined },
                { key: 'courses', label: 'Courses', color: 'bg-violet-600', badge: courses.length > 0 ? courses.length : undefined },
                { key: 'country', label: 'Country Profiles', color: 'bg-emerald-600', badge: countryProfiles.length > 0 ? countryProfiles.length : undefined },
                { key: 'market', label: 'Market Analysis', color: 'bg-amber-600', onSelect: fetchMarketTrends },
                { key: 'onet', label: 'O*NET Links', color: 'bg-orange-500', badge: onetLinks.length > 0 ? onetLinks.length : undefined },
              ],
            },
            {
              key: 'lists', label: 'Lists', color: 'bg-indigo-600',
              tabs: [
                { key: 'submissions', label: 'Submissions', color: 'bg-primary', badge: submissions.length > 0 ? submissions.length : undefined },
                { key: 'telemetry', label: 'Behavior', color: 'bg-purple-600', badge: telemetrySessionCount > 0 ? telemetrySessionCount : undefined },
                { key: 'waitlist', label: 'Waitlist', color: 'bg-indigo-600', badge: waitlistList.length > 0 ? waitlistList.length : undefined },
                { key: 'feedback', label: 'Feedback', color: 'bg-teal-700', badge: feedbackList.length > 0 ? feedbackList.length : undefined },
              ],
            },
            {
              key: 'settings', label: 'Settings', color: 'bg-cyan-600',
              tabs: [
                { key: 'testmode', label: 'Test Mode', color: 'bg-cyan-600', badge: testModeEnabled ? 'ON' : undefined, onSelect: fetchTestMode },
                { key: 'homepage', label: 'Homepage', color: 'bg-fuchsia-600', badge: homepageMode, onSelect: fetchHomepageMode },
                { key: 'templates', label: 'Email Templates', color: 'bg-pink-600' },
                { key: 'emailScheduler', label: 'Email Scheduler', color: 'bg-rose-600' },
                { key: 'smtp', label: 'SMTP Settings', color: 'bg-cyan-700' },
                { key: 'aiprovider', label: 'AI Provider', color: 'bg-orange-600', badge: aiProvider, onSelect: fetchAiProvider },
              ],
            },
          ]

          const activeGroup = TAB_GROUPS.find(g => g.tabs.some(t => t.key === activeTab)) ?? TAB_GROUPS[0]

          const selectTab = (tabKey: typeof activeTab) => {
            setActiveTab(tabKey)
            TAB_GROUPS.flatMap(g => g.tabs).find(t => t.key === tabKey)?.onSelect?.()
          }

          return (
            <>
              <div className="flex gap-1 flex-wrap">
                {TAB_GROUPS.map(group => (
                  <button
                    key={group.key}
                    onClick={() => selectTab(group.tabs[0].key)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeGroup.key === group.key ? `${group.color} text-white` : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {group.label}
                  </button>
                ))}
              </div>
              {activeGroup.tabs.length > 1 && (
                <div className="flex gap-1 flex-wrap mt-2 pt-2 border-t border-slate-100">
                  {activeGroup.tabs.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => selectTab(tab.key)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${activeTab === tab.key ? `${tab.color} text-white` : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {tab.label}
                      {tab.badge !== undefined && (
                        <span className="ml-1.5 text-[10px] bg-white/30 px-1.5 py-0.5 rounded-full capitalize">{tab.badge}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )
        })()}
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* ── Dashboard Tab ── */}
        {activeTab === 'dashboard' && (
          <>
            {dashboardLoading && !dashboardStats && (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {dashboardError && <p className="text-red-500 text-sm text-center py-8">{dashboardError}</p>}
            {shareToken && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-6 flex items-center gap-3">
                <p className="text-xs text-slate-500 flex-1">
                  Public, no-login link — anyone with it can view this dashboard:
                  <span className="block font-mono text-slate-700 mt-0.5 truncate">{`${typeof window !== 'undefined' ? window.location.origin : ''}/stats/${shareToken}`}</span>
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/stats/${shareToken}`).then(() => {
                      setShareLinkCopied(true)
                      setTimeout(() => setShareLinkCopied(false), 2000)
                    }).catch(() => {})
                  }}
                  className="text-xs font-medium bg-sky-600 text-white px-3 py-1.5 rounded-lg hover:bg-sky-700 transition-colors flex-none"
                >
                  {shareLinkCopied ? 'Copied' : 'Copy link'}
                </button>
                <button
                  onClick={handleRegenerateShareLink}
                  disabled={regeneratingShareLink}
                  title="Invalidates the current link and issues a new one"
                  className="text-xs font-medium bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors flex-none disabled:opacity-50"
                >
                  {regeneratingShareLink ? '…' : 'Regenerate'}
                </button>
              </div>
            )}
            {dashboardStats && <DashboardStatsView stats={dashboardStats} />}
          </>
        )}

        {/* ── Submissions Tab ── */}
        {activeTab === 'submissions' && (
          <>
            {loading && (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {fetchError && <p className="text-red-500 text-sm text-center py-8">{fetchError}</p>}
            {!loading && !fetchError && renderSubmissionsTable(submissions, 'No submissions yet', `submissions_${new Date().toISOString().slice(0, 10)}.csv`)}
          </>
        )}

        {/* ── Behavior (assessment telemetry) Tab ── */}
        {activeTab === 'telemetry' && (
          <>
            {telemetryLoading && (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {telemetryError && <p className="text-red-500 text-sm text-center py-8">{telemetryError}</p>}
            {!telemetryLoading && !telemetryError && (
              <TelemetryBehaviorView
                summary={telemetrySummary}
                drilldown={telemetryDrilldown}
                onDrilldown={setTelemetryDrilldown}
                onCloseDrilldown={() => setTelemetryDrilldown(null)}
              />
            )}
          </>
        )}

        {/* ── Feedback Tab ── */}
        {activeTab === 'feedback' && (
          <>
                {feedbackLoading && (
                  <div className="flex justify-center py-16">
                    <div className="w-7 h-7 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {feedbackError && <p className="text-red-500 text-sm text-center py-8">{feedbackError}</p>}
                {!feedbackLoading && !feedbackError && (
                  <>
                    <p className="text-sm text-slate-400 mb-4">{feedbackList.length} response{feedbackList.length !== 1 ? 's' : ''}</p>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50">
                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Age</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Country</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Accurate?</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Overall</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                            <th className="px-4 py-3" />
                          </tr>
                        </thead>
                        <tbody>
                          {feedbackList.map((fb, i) => (
                            <tr key={fb.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                              <td className="px-4 py-3 font-medium text-slate-800">{fb.fname}</td>
                              <td className="px-4 py-3 text-slate-500">{fb.email}</td>
                              <td className="px-4 py-3 text-slate-500">{fb.age}</td>
                              <td className="px-4 py-3 text-slate-500">{fb.country || '—'}</td>
                              <td className="px-4 py-3">
                                {fb.accurate ? (
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                                    fb.accurate === 'yes' ? 'bg-green-50 text-green-700' :
                                    fb.accurate === 'partially' ? 'bg-amber-50 text-amber-600' :
                                    'bg-red-50 text-red-600'
                                  }`}>{fb.accurate}</span>
                                ) : '—'}
                              </td>
                              <td className="px-4 py-3 text-slate-500">
                                {fb.rating_overall ? (
                                  <span className="font-semibold text-slate-700">{fb.rating_overall}<span className="text-slate-400 font-normal">/6</span></span>
                                ) : '—'}
                              </td>
                              <td className="px-4 py-3 text-slate-400 text-xs">{new Date(fb.created_at).toLocaleDateString()}</td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => setSelectedFeedback(fb)}
                                  className="text-xs text-primary hover:underline font-medium"
                                >
                                  View →
                                </button>
                              </td>
                            </tr>
                          ))}
                          {feedbackList.length === 0 && (
                            <tr>
                              <td colSpan={8} className="px-4 py-12 text-center text-slate-400">No feedback responses yet</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
          </>
        )}

        {/* ── Beta Testing Tab ── */}
        {activeTab === 'betaDashboard' && (
          <>
            {betaFeedbackLoading && (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {betaFeedbackError && <p className="text-red-500 text-sm text-center py-8">{betaFeedbackError}</p>}
            {!betaFeedbackLoading && !betaFeedbackError && (() => {
              const stage2Responses = betaFeedbackList.filter(bf => bf.stage2_completed_at)
              const stage2Total = stage2Responses.length
              const resultStageResponses = betaFeedbackList.filter(bf => bf.result_stage_completed_at)
              const resultStageTotal = resultStageResponses.length
              const recommendResponses = betaFeedbackList.filter(bf => bf.would_recommend)
              const recommendTotal = recommendResponses.length
              const payResponses = betaFeedbackList.filter(bf => bf.would_pay)
              const payTotal = payResponses.length
              const betaTotal = betaFeedbackList.length
              const totalSubmissions = betaSubmissions.length

              // Same cohort normalization as the "Who's testing" charts below,
              // duplicated here (rather than shared) because this runs outside
              // that block's own IIFE — keeps the export in sync with whichever
              // demographics filter is currently selected on screen.
              const demoFilterLabel = { all: 'All submissions', stage1: 'Stage 1', result: 'Result Stage', stage2: 'Stage 2' } as const
              type DemoRow = { age_bracket: string | null; experience_level: string | null; current_stage: string | null; country: string | null; nationality: string | null }
              const demoRows: DemoRow[] =
                betaDemographicsFilter === 'all'
                  ? betaSubmissions.map(s => ({ age_bracket: s.age_bracket ?? ageToBracket(s.age), experience_level: s.experience_level, current_stage: s.current_stage, country: s.country, nationality: s.nationality }))
                  : (betaDemographicsFilter === 'stage1' ? betaFeedbackList
                    : betaDemographicsFilter === 'result' ? resultStageResponses
                    : stage2Responses).map(bf => ({
                      age_bracket: bf.assessment_responses?.age_bracket ?? ageToBracket(bf.assessment_responses?.age),
                      experience_level: bf.assessment_responses?.experience_level ?? null,
                      current_stage: bf.assessment_responses?.current_stage ?? null,
                      country: bf.assessment_responses?.country ?? null,
                      nationality: bf.assessment_responses?.nationality ?? null,
                    }))

              const exportBetaDashboardReport = () => {
                const pct = (n: number, total: number) => total > 0 ? `${Math.round((n / total) * 100)}%` : ''
                const breakdownRows = (order: string[], labels: Record<string, string>, counts: Record<string, number>, total: number, colLabel: string) => {
                  const seen = new Set(order)
                  const rest = Object.keys(counts).filter(k => !seen.has(k))
                  const out: (string | number)[][] = [[colLabel, 'Count', 'Percent']]
                  for (const key of [...order, ...rest]) {
                    const n = counts[key] || 0
                    if (n === 0 && !order.includes(key)) continue
                    out.push([labels[key] || formatUnderscored(key), n, pct(n, total)])
                  }
                  return out
                }

                const rows: (string | number | null)[][] = [
                  ['Etijahi Beta Testing — Report', new Date().toLocaleString()],
                  [],
                  ['Feedback funnel', ''],
                  ['Metric', 'Count'],
                  ['Total submissions (everyone who took the beta assessment)', totalSubmissions],
                  ['Stage 1 — quick pulse (answered at least 1 of 3 taps)', betaTotal],
                  ['Result Stage (rated accuracy/recommend/pay on results page)', resultStageTotal],
                  ['Stage 2 — full survey (completed detailed post-report survey)', stage2Total],
                  [],
                  [`Demographics — ${demoFilterLabel[betaDemographicsFilter]} (${demoRows.length})`],
                  ...breakdownRows(AGE_BRACKET_ORDER, AGE_BRACKET_LABEL, countBy(demoRows, r => r.age_bracket), demoRows.length, 'Age group'),
                  [],
                  ...breakdownRows(EXPERIENCE_LEVEL_ORDER, EXPERIENCE_LEVEL_LABEL, countBy(demoRows, r => r.experience_level), demoRows.length, 'Experience level'),
                  [],
                  ...breakdownRows(CURRENT_STAGE_ORDER, CURRENT_STAGE_LABEL, countBy(demoRows, r => r.current_stage), demoRows.length, 'Current stage'),
                  [],
                  ...breakdownRows(COUNTRY_ORDER, COUNTRY_LABEL, countBy(demoRows, r => r.country), demoRows.length, 'Country'),
                  [],
                  ...breakdownRows(NATIONALITY_ORDER, NATIONALITY_LABEL, countBy(demoRows, r => r.nationality), demoRows.length, 'Nationality'),
                  [],
                  ['Report feedback (accuracy from Result Stage, recommend/pay from all who answered)'],
                  ['Overall accuracy — "spot on"', pct(countBy(resultStageResponses, bf => bf.result_accuracy).spot_on || 0, resultStageTotal), `${resultStageTotal} respondents`],
                  ['Would recommend — "yes"', pct(countBy(recommendResponses, bf => bf.would_recommend).yes || 0, recommendTotal), `${recommendTotal} respondents`],
                  ['Would pay — "definitely" or "maybe"', pct((countBy(payResponses, bf => bf.would_pay).definitely || 0) + (countBy(payResponses, bf => bf.would_pay).maybe || 0), payTotal), `${payTotal} respondents`],
                  [],
                  ...breakdownRows(SENTIMENT_ORDER.accuracy, SENTIMENT_LABEL, countBy(resultStageResponses, bf => bf.result_accuracy), resultStageTotal, 'How accurate was this?'),
                  [],
                  ...breakdownRows(SENTIMENT_ORDER.would_recommend, SENTIMENT_LABEL, countBy(recommendResponses, bf => bf.would_recommend), recommendTotal, 'Would recommend this to a friend?'),
                  [],
                  ...breakdownRows(SENTIMENT_ORDER.would_pay, SENTIMENT_LABEL, countBy(payResponses, bf => bf.would_pay), payTotal, 'Would pay for the full report?'),
                ]

                if (stage2Total > 0) {
                  const worthPayingCounts: Record<string, number> = {}
                  for (const bf of stage2Responses) for (const v of (bf.worth_paying_for || [])) worthPayingCounts[v] = (worthPayingCounts[v] || 0) + 1
                  const payBlockerCounts: Record<string, number> = {}
                  for (const bf of stage2Responses) for (const v of (bf.pay_blockers || [])) payBlockerCounts[v] = (payBlockerCounts[v] || 0) + 1
                  rows.push(
                    [],
                    [`Stage 2 — full survey analytics (${stage2Total} respondents)`],
                    ['Hit an issue', pct(countBy(stage2Responses, bf => bf.had_issues).yes || 0, stage2Total)],
                    ['Took it in English', pct(countBy(stage2Responses, bf => bf.language_used).en || 0, stage2Total)],
                    ['Took it in Arabic', pct(countBy(stage2Responses, bf => bf.language_used).ar || 0, stage2Total)],
                    ['Used both languages', pct(countBy(stage2Responses, bf => bf.language_used).both || 0, stage2Total)],
                    [],
                    ...breakdownRows(SENTIMENT_ORDER.would_pay_at_price, SENTIMENT_LABEL, countBy(stage2Responses, bf => bf.would_pay_at_price), stage2Total, 'Would pay, at the shown price?'),
                    [],
                    ...breakdownRows(SENTIMENT_ORDER.career_explained, SENTIMENT_LABEL, countBy(stage2Responses, bf => bf.career_explained), stage2Total, 'Understood why each career was suggested?'),
                    [],
                    ...breakdownRows(SENTIMENT_ORDER.wants_coach_session, SENTIMENT_LABEL, countBy(stage2Responses, bf => bf.wants_coach_session), stage2Total, 'Wants a coach session?'),
                    [],
                    ['Careers seriously considered', 'Count', 'Percent'],
                    ...Object.entries(countBy(stage2Responses, bf => bf.careers_seriously_considered)).map(([k, n]) => [CAREERS_CONSIDERED_LABEL[k] || formatUnderscored(k), n, pct(n, stage2Total)]),
                    [],
                    ['Most useful part', 'Count', 'Percent'],
                    ...Object.entries(countBy(stage2Responses, bf => bf.most_useful_part)).map(([k, n]) => [REPORT_SECTION_LABEL[k] || formatUnderscored(k), n, pct(n, stage2Total)]),
                    [],
                    ['Least useful part', 'Count', 'Percent'],
                    ...Object.entries(countBy(stage2Responses, bf => bf.least_useful_part)).map(([k, n]) => [REPORT_SECTION_LABEL[k] || formatUnderscored(k), n, pct(n, stage2Total)]),
                    [],
                    ['What would make it worth paying for', 'Count', 'Percent'],
                    ...Object.entries(worthPayingCounts).sort((a, b) => b[1] - a[1]).map(([k, n]) => [WORTH_PAYING_FOR_LABEL[k] || formatUnderscored(k), n, pct(n, stage2Total)]),
                    [],
                    ['What would stop them from buying', 'Count', 'Percent'],
                    ...Object.entries(payBlockerCounts).sort((a, b) => b[1] - a[1]).map(([k, n]) => [PAY_BLOCKER_LABEL[k] || formatUnderscored(k), n, pct(n, stage2Total)]),
                  )

                  // Legacy Beta 1 fields (removed from the live form) — only worth a section
                  // if any respondent in range actually has them, so a report scoped to only
                  // redesigned-form submissions doesn't show an all-zero legacy block.
                  const hasLegacy = stage2Responses.some(bf => bf.personality_accuracy || bf.overall_value != null || (bf.most_valuable_parts && bf.most_valuable_parts.length > 0))
                  if (hasLegacy) {
                    const avgOverallValue = stage2Responses.reduce((sum, bf) => sum + (bf.overall_value || 0), 0) / Math.max(1, stage2Responses.filter(bf => bf.overall_value != null).length)
                    const mvpCounts: Record<string, number> = {}
                    for (const bf of stage2Responses) for (const v of (bf.most_valuable_parts || [])) mvpCounts[v] = (mvpCounts[v] || 0) + 1
                    rows.push(
                      [],
                      ['Legacy Beta 1 fields (removed from the live form)'],
                      ['Overall value — average (1-6)', avgOverallValue.toFixed(1)],
                      [],
                      ['Most valuable parts (legacy)', 'Count', 'Percent'],
                      ...Object.entries(mvpCounts).sort((a, b) => b[1] - a[1]).map(([k, n]) => [formatUnderscored(k), n, pct(n, stage2Total)]),
                      [],
                      ...breakdownRows(SENTIMENT_ORDER.accuracy, SENTIMENT_LABEL, countBy(stage2Responses, bf => bf.personality_accuracy), stage2Total, 'Personality type accuracy (legacy)'),
                      [],
                      ...breakdownRows(SENTIMENT_ORDER.accuracy, SENTIMENT_LABEL, countBy(stage2Responses, bf => bf.values_accuracy), stage2Total, 'Core values accuracy (legacy)'),
                      [],
                      ...breakdownRows(SENTIMENT_ORDER.accuracy, SENTIMENT_LABEL, countBy(stage2Responses, bf => bf.strengths_accuracy), stage2Total, 'Strengths accuracy (legacy)'),
                      [],
                      ...breakdownRows(SENTIMENT_ORDER.accuracy, SENTIMENT_LABEL, countBy(stage2Responses, bf => bf.career_matches_accuracy), stage2Total, 'Career matches accuracy (legacy)'),
                    )
                  }
                }

                downloadCSV(`beta_dashboard_report_${new Date().toISOString().slice(0, 10)}.csv`, rows)
              }

              return (
                <>
                  {totalSubmissions > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <p className="text-sm font-semibold text-slate-700">Feedback funnel</p>
                        <DownloadCSVButton onClick={exportBetaDashboardReport} label="Download full report" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <BetaStatTile
                          label="Total submissions"
                          value={String(totalSubmissions)}
                          sublabel="everyone who took the beta assessment"
                        />
                        <BetaStatTile
                          label="Stage 1 — quick pulse"
                          value={String(betaTotal)}
                          sublabel="answered at least one of the 3 quick taps on the loading screen"
                        />
                        <BetaStatTile
                          label="Result Stage"
                          value={String(resultStageTotal)}
                          sublabel="rated accuracy/recommend/pay on the results page"
                        />
                        <BetaStatTile
                          label="Stage 2 — full survey"
                          value={String(stage2Total)}
                          sublabel="completed the detailed post-report survey"
                        />
                      </div>
                    </div>
                  )}
                  {totalSubmissions > 0 && (() => {
                    // Normalize each cohort to the same flat shape — "all" reads
                    // demographic fields straight off Submission, while "stage1"/
                    // "result"/"stage2" read them off the nested assessment_responses
                    // join on a BetaFeedbackEntry — so one countBy call below works
                    // regardless of which cohort is selected.
                    type DemoRow = { age_bracket: string | null; experience_level: string | null; current_stage: string | null; country: string | null; nationality: string | null }
                    const demoRows: DemoRow[] =
                      betaDemographicsFilter === 'all'
                        ? betaSubmissions.map(s => ({ age_bracket: s.age_bracket ?? ageToBracket(s.age), experience_level: s.experience_level, current_stage: s.current_stage, country: s.country, nationality: s.nationality }))
                        : (betaDemographicsFilter === 'stage1' ? betaFeedbackList
                          : betaDemographicsFilter === 'result' ? resultStageResponses
                          : stage2Responses).map(bf => ({
                            age_bracket: bf.assessment_responses?.age_bracket ?? ageToBracket(bf.assessment_responses?.age),
                            experience_level: bf.assessment_responses?.experience_level ?? null,
                            current_stage: bf.assessment_responses?.current_stage ?? null,
                            country: bf.assessment_responses?.country ?? null,
                            nationality: bf.assessment_responses?.nationality ?? null,
                          }))
                    const demoTotal = demoRows.length
                    const filterCount = { all: totalSubmissions, stage1: betaTotal, result: resultStageTotal, stage2: stage2Total }
                    const filterLabel = { all: 'All submissions', stage1: 'Stage 1', result: 'Result Stage', stage2: 'Stage 2' }
                    return (
                      <div className="mb-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                          <p className="text-sm font-semibold text-slate-700">
                            Who&apos;s testing <span className="text-slate-400 font-normal">— {filterLabel[betaDemographicsFilter]} ({demoTotal})</span>
                          </p>
                          <div className="flex gap-2">
                            {(['all', 'stage1', 'result', 'stage2'] as const).map(key => (
                              <button
                                key={key}
                                onClick={() => setBetaDemographicsFilter(key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                  betaDemographicsFilter === key ? 'bg-teal-700 text-white' : 'bg-white text-slate-400 border border-slate-100 hover:text-slate-600'
                                }`}
                              >
                                {filterLabel[key]} ({filterCount[key]})
                              </button>
                            ))}
                          </div>
                        </div>
                        {demoTotal === 0 ? (
                          <p className="text-slate-400 text-xs text-center py-6">No submissions in this cohort yet</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <BetaCategoryChart
                              title="Age group"
                              order={AGE_BRACKET_ORDER}
                              labels={AGE_BRACKET_LABEL}
                              counts={countBy(demoRows, r => r.age_bracket)}
                              total={demoTotal}
                            />
                            <BetaCategoryChart
                              title="Experience level"
                              order={EXPERIENCE_LEVEL_ORDER}
                              labels={EXPERIENCE_LEVEL_LABEL}
                              counts={countBy(demoRows, r => r.experience_level)}
                              total={demoTotal}
                            />
                            <BetaCategoryChart
                              title="Current stage"
                              order={CURRENT_STAGE_ORDER}
                              labels={CURRENT_STAGE_LABEL}
                              counts={countBy(demoRows, r => r.current_stage)}
                              total={demoTotal}
                            />
                            <BetaCategoryChart
                              title="Country"
                              order={COUNTRY_ORDER}
                              labels={COUNTRY_LABEL}
                              counts={countBy(demoRows, r => r.country)}
                              total={demoTotal}
                            />
                            <BetaCategoryChart
                              title="Nationality"
                              order={NATIONALITY_ORDER}
                              labels={NATIONALITY_LABEL}
                              counts={countBy(demoRows, r => r.nationality)}
                              total={demoTotal}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })()}
                  {resultStageTotal === 0 && recommendTotal === 0 && payTotal === 0 && (
                    <p className="text-sm text-slate-400 text-center py-6">No Result Stage responses yet</p>
                  )}
                  {(resultStageTotal > 0 || recommendTotal > 0 || payTotal > 0) && (
                    <div className="mb-6">
                      <p className="text-sm font-semibold text-slate-700 mb-3">Report feedback <span className="text-slate-400 font-normal">— accuracy from {resultStageTotal} Result Stage respondents, recommend/pay from all respondents who answered (of {betaTotal} who started Stage 1)</span></p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                        <BetaStatTile
                          label="Overall accuracy"
                          value={resultStageTotal > 0 ? `${Math.round(((countBy(resultStageResponses, bf => bf.result_accuracy).spot_on || 0) / resultStageTotal) * 100)}%` : '—'}
                          sublabel="“spot on”"
                          onClick={() => setBetaStatDrilldown({
                            title: 'Rated the report "spot on" for accuracy',
                            rows: resultStageResponses.filter(bf => bf.result_accuracy === 'spot_on').map(bf => ({ bf, note: 'Spot on' })),
                          })}
                        />
                        <BetaStatTile
                          label="Would recommend"
                          value={recommendTotal > 0 ? `${Math.round(((countBy(recommendResponses, bf => bf.would_recommend).yes || 0) / recommendTotal) * 100)}%` : '—'}
                          sublabel={`answered “yes” (${recommendTotal} responses)`}
                          onClick={() => setBetaStatDrilldown({
                            title: 'Would recommend to a friend',
                            rows: recommendResponses.filter(bf => bf.would_recommend === 'yes').map(bf => ({ bf, note: 'Yes' })),
                          })}
                        />
                        <BetaStatTile
                          label="Would pay for it"
                          value={payTotal > 0 ? `${Math.round((((countBy(payResponses, bf => bf.would_pay).definitely || 0) + (countBy(payResponses, bf => bf.would_pay).maybe || 0)) / payTotal) * 100)}%` : '—'}
                          sublabel={`“definitely” or “maybe” (${payTotal} responses)`}
                          onClick={() => setBetaStatDrilldown({
                            title: 'Would pay for the full report',
                            rows: payResponses
                              .filter(bf => bf.would_pay === 'definitely' || bf.would_pay === 'maybe')
                              .map(bf => ({ bf, note: SENTIMENT_LABEL[bf.would_pay || ''] || bf.would_pay || '' })),
                          })}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <BetaSentimentChart
                          title="How accurate was this?"
                          orderKey="accuracy"
                          counts={countBy(resultStageResponses, bf => bf.result_accuracy)}
                          total={resultStageTotal}
                        />
                        <BetaSentimentChart
                          title="Would recommend this to a friend?"
                          orderKey="would_recommend"
                          counts={countBy(recommendResponses, bf => bf.would_recommend)}
                          total={recommendTotal}
                        />
                        <BetaSentimentChart
                          title="Would pay for the full report?"
                          orderKey="would_pay"
                          counts={countBy(payResponses, bf => bf.would_pay)}
                          total={payTotal}
                        />
                      </div>
                    </div>
                  )}
                  {stage2Total === 0 && (
                    <p className="text-sm text-slate-400 text-center py-12">No completed beta surveys yet</p>
                  )}
                  {stage2Total > 0 && (
                      <div className="mb-6">
                        <p className="text-sm font-semibold text-slate-700 mb-3">Feedback analytics <span className="text-slate-400 font-normal">— {stage2Total} Stage 2 respondents (of {betaTotal} who started Stage 1)</span></p>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <BetaStatTile
                            label="Overall value"
                            value={`${(stage2Responses.reduce((sum, bf) => sum + (bf.overall_value || 0), 0) / Math.max(1, stage2Responses.filter(bf => bf.overall_value != null).length)).toFixed(1)}/6`}
                            sublabel="average rating"
                            onClick={() => setBetaStatDrilldown({
                              title: 'Overall value ratings',
                              rows: stage2Responses
                                .filter(bf => bf.overall_value != null)
                                .sort((a, b) => (b.overall_value || 0) - (a.overall_value || 0))
                                .map(bf => ({ bf, note: `${bf.overall_value}/6` })),
                            })}
                          />
                          <BetaStatTile
                            label="Hit an issue"
                            value={`${Math.round(((countBy(stage2Responses, bf => bf.had_issues).yes || 0) / stage2Total) * 100)}%`}
                            sublabel="errors or glitches"
                            onClick={() => setBetaStatDrilldown({
                              title: 'Hit an error, glitch, or confusing moment',
                              rows: stage2Responses.filter(bf => bf.had_issues === 'yes').map(bf => ({ bf, note: bf.issue_detail || 'No details given' })),
                            })}
                          />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          <BetaStatTile
                            label="Took it in English"
                            value={`${Math.round(((countBy(stage2Responses, bf => bf.language_used).en || 0) / stage2Total) * 100)}%`}
                            sublabel={`${countBy(stage2Responses, bf => bf.language_used).en || 0} people`}
                            onClick={() => setBetaStatDrilldown({
                              title: 'Took the assessment in English',
                              rows: stage2Responses.filter(bf => bf.language_used === 'en').map(bf => ({ bf, note: 'English' })),
                            })}
                          />
                          <BetaStatTile
                            label="Took it in Arabic"
                            value={`${Math.round(((countBy(stage2Responses, bf => bf.language_used).ar || 0) / stage2Total) * 100)}%`}
                            sublabel={`${countBy(stage2Responses, bf => bf.language_used).ar || 0} people`}
                            onClick={() => setBetaStatDrilldown({
                              title: 'Took the assessment in Arabic',
                              rows: stage2Responses.filter(bf => bf.language_used === 'ar').map(bf => ({ bf, note: 'Arabic' })),
                            })}
                          />
                          <BetaStatTile
                            label="Used both languages"
                            value={`${Math.round(((countBy(stage2Responses, bf => bf.language_used).both || 0) / stage2Total) * 100)}%`}
                            sublabel={`${countBy(stage2Responses, bf => bf.language_used).both || 0} people`}
                            onClick={() => setBetaStatDrilldown({
                              title: 'Used both languages',
                              rows: stage2Responses.filter(bf => bf.language_used === 'both').map(bf => ({ bf, note: 'Both' })),
                            })}
                          />
                          {/* Hidden for now, per request — leave the tile here, ready to re-enable.
                          {(() => {
                            const mentorAnswered = stage2Responses.filter(bf => bf.felt_like_mentor != null)
                            const mentorCount = countBy(mentorAnswered, bf => bf.felt_like_mentor).mentor || 0
                            return (
                              <BetaStatTile
                                label="Felt like a mentor"
                                value={mentorAnswered.length > 0 ? `${Math.round((mentorCount / mentorAnswered.length) * 100)}%` : '—'}
                                sublabel={mentorAnswered.length > 0 ? `${mentorAnswered.length} answered` : 'no answers yet'}
                                onClick={mentorAnswered.length > 0 ? () => setBetaStatDrilldown({
                                  title: 'Felt like a mentor who understands your context',
                                  rows: mentorAnswered.filter(bf => bf.felt_like_mentor === 'mentor').map(bf => ({ bf, note: 'Mentor' })),
                                }) : undefined}
                              />
                            )
                          })()}
                          */}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <BetaSentimentChart
                            title="Would pay, at the shown price?"
                            orderKey="would_pay_at_price"
                            counts={countBy(stage2Responses, bf => bf.would_pay_at_price)}
                            total={stage2Total}
                          />
                          <BetaSentimentChart
                            title="Understood why each career was suggested?"
                            orderKey="career_explained"
                            counts={countBy(stage2Responses, bf => bf.career_explained)}
                            total={stage2Total}
                          />
                          <BetaSentimentChart
                            title="Wants a coach session?"
                            orderKey="wants_coach_session"
                            counts={countBy(stage2Responses, bf => bf.wants_coach_session)}
                            total={stage2Total}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <BetaCategoryChart
                            title="Careers seriously considered"
                            order={['none', 'one', 'a_few', 'four_or_five']}
                            labels={CAREERS_CONSIDERED_LABEL}
                            counts={countBy(stage2Responses, bf => bf.careers_seriously_considered)}
                            total={stage2Total}
                          />
                          <BetaCategoryChart
                            title="Most useful part of the report"
                            order={['personality', 'values', 'strengths', 'careers', 'ai_impact', 'jobs', 'companies', 'courses', 'plan']}
                            labels={REPORT_SECTION_LABEL}
                            counts={countBy(stage2Responses, bf => bf.most_useful_part)}
                            total={stage2Total}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <BetaRankedMultiChart
                            title="What would make it worth paying for"
                            lists={stage2Responses.map(bf => bf.worth_paying_for)}
                            labels={WORTH_PAYING_FOR_LABEL}
                            total={stage2Total}
                          />
                          <BetaRankedMultiChart
                            title="What would stop them from buying"
                            lists={stage2Responses.map(bf => bf.pay_blockers)}
                            labels={PAY_BLOCKER_LABEL}
                            total={stage2Total}
                          />
                        </div>
                        {stage2Responses.some(bf => bf.personality_accuracy || bf.overall_value != null || (bf.most_valuable_parts && bf.most_valuable_parts.length > 0)) && (
                          <>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 mt-6">Legacy Beta 1 fields (removed from the live form)</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <BetaScaleChart title="Overall value (1-6, legacy)" values={stage2Responses.map(bf => bf.overall_value)} />
                              <BetaRankedMultiChart
                                title="Most valuable parts of the report (legacy)"
                                lists={stage2Responses.map(bf => bf.most_valuable_parts)}
                                labels={REPORT_SECTION_LABEL}
                                total={stage2Total}
                              />
                            </div>
                            <BetaAccuracyChart
                              title="Report accuracy by section (legacy)"
                              dimensions={[
                                { label: 'Personality type', values: stage2Responses.map(bf => bf.personality_accuracy) },
                                { label: 'Core values', values: stage2Responses.map(bf => bf.values_accuracy) },
                                { label: 'Strengths', values: stage2Responses.map(bf => bf.strengths_accuracy) },
                                { label: 'Career matches', values: stage2Responses.map(bf => bf.career_matches_accuracy) },
                              ]}
                            />
                          </>
                        )}
                      </div>
                    )}
                    {betaStatDrilldown && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setBetaStatDrilldown(null)}>
                        <div className="absolute inset-0 bg-slate-900/40" />
                        <div
                          className="relative bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md max-h-[80vh] flex flex-col"
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <div>
                              <h3 className="text-sm font-semibold text-slate-800">{betaStatDrilldown.title}</h3>
                              <p className="text-xs text-slate-400">{betaStatDrilldown.rows.length} {betaStatDrilldown.rows.length === 1 ? 'person' : 'people'}</p>
                            </div>
                            <button onClick={() => setBetaStatDrilldown(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none px-1">×</button>
                          </div>
                          <div className="overflow-y-auto divide-y divide-slate-50">
                            {betaStatDrilldown.rows.length === 0 ? (
                              <p className="text-sm text-slate-400 text-center py-10">No one matches this yet.</p>
                            ) : betaStatDrilldown.rows.map(({ bf, note }) => (
                              <button
                                key={bf.id}
                                onClick={() => { setSelectedBetaFeedback(bf); setBetaStatDrilldown(null) }}
                                className="w-full flex items-center justify-between gap-3 px-5 py-3 text-left hover:bg-slate-50 transition-colors"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-800 truncate">{bf.assessment_responses?.full_name || 'Unknown'}</p>
                                  <p className="text-xs text-slate-400 truncate">{bf.assessment_responses?.email || '—'}</p>
                                </div>
                                <span className="shrink-0 text-xs font-medium text-primary bg-lightblue px-2 py-1 rounded-full max-w-[45%] truncate">{note}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                </>
              )
            })()}
          </>
        )}

        {activeTab === 'betaSubmissions' && (
          <>
            {loading && (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {fetchError && <p className="text-red-500 text-sm text-center py-8">{fetchError}</p>}
            {!loading && !fetchError && renderSubmissionsTable(betaSubmissions, 'No beta submissions yet', `beta_submissions_${new Date().toISOString().slice(0, 10)}.csv`)}
          </>
        )}

        {activeTab === 'betaCareerRecs' && (
          <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
              <div>
                <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Career Catalog</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Career suggestions are always shown to the user immediately — nothing here blocks that. This is
                  a review queue: a career surfaces under &ldquo;Recommended&rdquo; once it's actually been suggested to
                  someone, so you can review it after the fact. Reject it and it's immediately excluded from
                  scoring and AI selection for every future report — it won't be suggested again until re-approved.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <input
                  type="text"
                  value={careersCatalogSearch}
                  onChange={e => setCareersCatalogSearch(e.target.value)}
                  placeholder="Search by title or sector…"
                  className="px-3 py-1.5 rounded-lg text-xs border border-slate-200 flex-1 min-w-[180px]"
                />
                <div className="flex gap-2">
                  {(['recommended', 'all', 'approved', 'rejected'] as const).map(key => (
                    <button
                      key={key}
                      onClick={() => setCareersCatalogFilter(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                        careersCatalogFilter === key ? 'bg-teal-700 text-white' : 'bg-white text-slate-400 border border-slate-100 hover:text-slate-600'
                      }`}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>
              {(careersCatalogLoading || allCareerRecsLoading) && (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {careersCatalogError && <p className="text-red-500 text-xs text-center py-4">{careersCatalogError}</p>}
              {allCareerRecsError && (
                <p className="text-amber-600 text-xs text-center py-1">
                  Couldn&rsquo;t load who&rsquo;s been recommended what ({allCareerRecsError}) — approve/reject still works, but &ldquo;Recommended to&rdquo; may be incomplete.
                </p>
              )}
              {(() => {
                const exportCareerCatalog = () => {
                  const recommendedTo = new Map<string, { full_name: string | null; email: string | null }[]>()
                  for (const sub of betaCareerRecsGenerated) {
                    for (const rec of sub.career_recommendations || []) {
                      const key = (rec.title || '').trim().toLowerCase()
                      if (!key) continue
                      const list = recommendedTo.get(key) || []
                      list.push({ full_name: sub.full_name, email: sub.email })
                      recommendedTo.set(key, list)
                    }
                  }
                  const rows: (string | number | null)[][] = [
                    ['Career', 'Sector', 'Approved', 'Recommended to'],
                    ...careersCatalog.map(c => [
                      c.title, c.sector, c.is_approved ? 'yes' : 'no',
                      (recommendedTo.get((c.title || '').trim().toLowerCase()) || [])
                        .map(r => r.full_name || r.email || 'Unnamed').join('; '),
                    ]),
                  ]
                  downloadCSV(`beta_career_catalog_${new Date().toISOString().slice(0, 10)}.csv`, rows)
                }
                return (
                  <div className="flex justify-end mb-3">
                    <DownloadCSVButton onClick={exportCareerCatalog} label="Download catalog" />
                  </div>
                )
              })()}
              {!careersCatalogLoading && !allCareerRecsLoading && !careersCatalogError && (() => {
                // Every title an AI recommendation call has actually surfaced to a beta
                // user, with who received it — the AI only ever picks from this catalog
                // verbatim (see careers_prompt in report_generator.py), so a title match
                // reliably identifies which catalog row was shown.
                const recommendedTo = new Map<string, { full_name: string | null; email: string | null }[]>()
                for (const sub of betaCareerRecsGenerated) {
                  for (const rec of sub.career_recommendations || []) {
                    const key = (rec.title || '').trim().toLowerCase()
                    if (!key) continue
                    const list = recommendedTo.get(key) || []
                    list.push({ full_name: sub.full_name, email: sub.email })
                    recommendedTo.set(key, list)
                  }
                }

                const q = careersCatalogSearch.trim().toLowerCase()
                let visible = careersCatalog
                  .filter(c => {
                    if (careersCatalogFilter === 'recommended') return recommendedTo.has((c.title || '').trim().toLowerCase())
                    if (careersCatalogFilter === 'approved') return c.is_approved
                    if (careersCatalogFilter === 'rejected') return !c.is_approved
                    return true
                  })
                  .filter(c => !q || c.title?.toLowerCase().includes(q) || c.sector?.toLowerCase().includes(q))
                if (careersCatalogFilter === 'recommended') {
                  visible = [...visible].sort((a, b) =>
                    (recommendedTo.get((b.title || '').trim().toLowerCase())?.length || 0)
                    - (recommendedTo.get((a.title || '').trim().toLowerCase())?.length || 0))
                }
                if (visible.length === 0) {
                  return (
                    <p className="text-slate-400 text-xs text-center py-6">
                      {careersCatalogFilter === 'recommended'
                        ? 'No careers have been recommended to a beta user yet'
                        : 'No careers match this filter'}
                    </p>
                  )
                }
                return (
                  <div className="max-h-[32rem] overflow-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-slate-50 text-[10px] font-bold tracking-widest uppercase text-slate-400">
                        <tr>
                          <th className="text-start px-4 py-2">Career</th>
                          <th className="text-start px-4 py-2">Sector</th>
                          <th className="text-start px-4 py-2">Recommended to</th>
                          <th className="text-end px-4 py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {visible.map(c => {
                          const recipients = recommendedTo.get((c.title || '').trim().toLowerCase()) || []
                          return (
                            <tr key={c.id}>
                              <td className="px-4 py-2.5 text-slate-800">{c.title}</td>
                              <td className="px-4 py-2.5 text-slate-400">{c.sector}</td>
                              <td className="px-4 py-2.5 text-slate-500">
                                {recipients.length === 0 ? (
                                  <span className="text-slate-300">—</span>
                                ) : (
                                  <span title={recipients.map(r => r.full_name || r.email || 'Unnamed').join(', ')}>
                                    {recipients.slice(0, 2).map(r => r.full_name || r.email || 'Unnamed').join(', ')}
                                    {recipients.length > 2 && ` +${recipients.length - 2} more`}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex gap-1.5 justify-end">
                                  <button
                                    onClick={() => setCareerApproval(c.id, true)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                      c.is_approved ? 'bg-teal-700 text-white' : 'bg-slate-50 text-slate-400 hover:text-teal-700'
                                    }`}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => setCareerApproval(c.id, false)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                      !c.is_approved ? 'bg-red-600 text-white' : 'bg-slate-50 text-slate-400 hover:text-red-600'
                                    }`}
                                  >
                                    Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {activeTab === 'betaFeedback' && (
          <>
            {betaFeedbackLoading && (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {betaFeedbackError && <p className="text-red-500 text-sm text-center py-8">{betaFeedbackError}</p>}
            {!betaFeedbackLoading && !betaFeedbackError && (() => {
              const statusOptions = distinctValues(betaFeedbackList.map(bf => bf.assessment_responses?.current_stage))
              const ageOptions = distinctValues(betaFeedbackList.map(bf => bf.assessment_responses?.age_bracket ?? ageToBracket(bf.assessment_responses?.age)))
              const visibleBetaFeedback = betaFeedbackList
                .filter(bf => betaFeedbackStageFilter === 'all' || betaFeedbackStageOf(bf) === betaFeedbackStageFilter)
                .filter(bf => betaFeedbackStatusFilter === 'all' || bf.assessment_responses?.current_stage === betaFeedbackStatusFilter)
                .filter(bf => betaFeedbackAgeFilter === 'all' || (bf.assessment_responses?.age_bracket ?? ageToBracket(bf.assessment_responses?.age)) === betaFeedbackAgeFilter)
              const exportBetaFeedback = () => {
                const rows: (string | number | null)[][] = [
                  [
                    'Name', 'Email', 'Country', 'Nationality', 'Age', 'Experience', 'Current stage', 'Cohort', 'Feedback stage', 'Locale',
                    'S1: clarity (1-5)', 'S1: feeling (1-5)', 'S1: understood (1-5)', 'S1: wants from results', 'Stage 1 completed at',
                    'Accuracy (result_accuracy)', 'Would recommend', 'Would pay (Result Stage)', 'Result Stage completed at',
                    'Language used', 'Device', 'Understood after (1-5)', 'Felt like coach', 'Careers seriously considered',
                    'Understood why suggested', 'Most useful part', 'Least useful part', 'First action (text)',
                    'Would pay at price', 'Pay blockers', 'Pay blocker — other (text)', 'Top pay blocker',
                    'Worth paying for', 'Wants coach session', 'Had issues', 'Issue detail',
                    'Stage 2 completed at', 'Submitted at',
                    // Legacy Beta 1 columns, removed from the live form — kept so a CSV
                    // export spanning both cohorts doesn't silently drop old answers.
                    'Personality accuracy (legacy)', 'Values accuracy (legacy)', 'Strengths accuracy (legacy)',
                    'Career matches accuracy (legacy)', 'Wrong career (legacy text)', 'Missing career (legacy text)',
                    'AI impact useful (legacy 1-6)', 'AI impact credible (legacy 1-6)', 'AI impact changed thinking (legacy)',
                    'Jobs relevant (legacy 1-6)', 'Companies fit (legacy 1-6)', 'Courses useful (legacy 1-6)',
                    'Plan would follow (legacy)', 'Clear next step (legacy)', 'Arabic natural (legacy)',
                    'Overall value (legacy 1-6)', 'Most valuable parts (legacy)', 'Would pay reason (legacy text)',
                    'Surprised (legacy text)', 'Not me (legacy text)', 'Other (text)',
                  ],
                  ...visibleBetaFeedback.map(bf => [
                    bf.assessment_responses?.full_name || '', bf.assessment_responses?.email || '',
                    bf.assessment_responses?.country || '', bf.assessment_responses?.nationality || '',
                    bf.assessment_responses?.age ?? (bf.assessment_responses?.age_bracket ? AGE_BRACKET_LABEL[bf.assessment_responses.age_bracket] || bf.assessment_responses.age_bracket : '') ?? '',
                    bf.assessment_responses?.experience_level ? (EXPERIENCE_LEVEL_LABEL[bf.assessment_responses.experience_level] || bf.assessment_responses.experience_level) : '',
                    bf.assessment_responses?.current_stage || '', cohortLabel({ created_at: bf.created_at, cohort_override: bf.assessment_responses?.cohort_override }),
                    BETA_FEEDBACK_STAGE_LABELS[betaFeedbackStageOf(bf)], bf.locale || '',
                    bf.s1_clarity, bf.s1_feeling, bf.s1_understood, bf.s1_intent ? formatUnderscored(bf.s1_intent) : '',
                    bf.stage1_completed_at ? new Date(bf.stage1_completed_at).toLocaleString() : '',
                    // would_recommend/would_pay are single columns asked both on the
                    // Result Stage and again in Stage 2 — one answer, not two independent
                    // captures, so one pair of columns. Stage 2's own, richer priced
                    // question (would_pay_at_price) is a separate column further down.
                    bf.result_accuracy || '', bf.would_recommend || '', bf.would_pay || '', bf.result_stage_completed_at ? new Date(bf.result_stage_completed_at).toLocaleString() : '',
                    bf.language_used || '', bf.device || '', bf.understood_after, bf.felt_like_mentor || '',
                    bf.careers_seriously_considered ? (CAREERS_CONSIDERED_LABEL[bf.careers_seriously_considered] || bf.careers_seriously_considered) : '',
                    bf.career_explained ? (CAREER_EXPLAINED_LABEL[bf.career_explained] || bf.career_explained) : '',
                    bf.most_useful_part ? (REPORT_SECTION_LABEL[bf.most_useful_part] || bf.most_useful_part) : '',
                    bf.least_useful_part ? (REPORT_SECTION_LABEL[bf.least_useful_part] || bf.least_useful_part) : '',
                    bf.first_action_text || '',
                    bf.would_pay_at_price ? (WOULD_PAY_AT_PRICE_LABEL[bf.would_pay_at_price] || bf.would_pay_at_price) : '',
                    (bf.pay_blockers || []).map(k => PAY_BLOCKER_LABEL[k] || k).join('; '),
                    bf.pay_blocker_other_text || '',
                    bf.pay_blocker_priority ? (PAY_BLOCKER_LABEL[bf.pay_blocker_priority] || bf.pay_blocker_priority) : '',
                    (bf.worth_paying_for || []).map(k => WORTH_PAYING_FOR_LABEL[k] || k).join('; '),
                    bf.wants_coach_session ? (WANTS_COACH_LABEL[bf.wants_coach_session] || bf.wants_coach_session) : '',
                    bf.had_issues || '', bf.issue_detail || '',
                    bf.stage2_completed_at ? new Date(bf.stage2_completed_at).toLocaleString() : '', new Date(bf.created_at).toLocaleString(),
                    bf.personality_accuracy || '', bf.values_accuracy || '', bf.strengths_accuracy || '', bf.career_matches_accuracy || '',
                    bf.wrong_career_text || '', bf.missing_career_text || '',
                    bf.ai_impact_useful, bf.ai_impact_credible, bf.ai_impact_changed_thinking || '', bf.jobs_relevant,
                    bf.companies_fit, bf.courses_useful, bf.plan_would_follow || '', bf.clear_next_step || '', bf.arabic_natural || '',
                    bf.overall_value, (bf.most_valuable_parts || []).join('; '), bf.would_pay_reason || '',
                    bf.surprised_text || '', bf.not_me_text || '', bf.other_text || '',
                  ]),
                ]
                downloadCSV(`beta_feedback_${new Date().toISOString().slice(0, 10)}.csv`, rows)
              }
              return (
              <>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <p className="text-sm text-slate-400">{visibleBetaFeedback.length} response{visibleBetaFeedback.length !== 1 ? 's' : ''}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <DownloadCSVButton onClick={exportBetaFeedback} />
                        {(['all', 'started', 'stage1', 'result', 'stage2'] as const).map(key => (
                          <button
                            key={key}
                            onClick={() => setBetaFeedbackStageFilter(key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              betaFeedbackStageFilter === key ? 'bg-teal-700 text-white' : 'bg-white text-slate-400 border border-slate-100 hover:text-slate-600'
                            }`}
                          >
                            {key === 'all' ? 'All' : BETA_FEEDBACK_STAGE_LABELS[key]}
                          </button>
                        ))}
                        <select
                          value={betaFeedbackStatusFilter}
                          onChange={e => setBetaFeedbackStatusFilter(e.target.value)}
                          className="text-xs font-medium rounded-lg border border-slate-100 bg-white text-slate-600 px-2 py-1.5 capitalize"
                        >
                          <option value="all">All statuses</option>
                          {statusOptions.map(v => (
                            <option key={v} value={v} className="capitalize">{formatUnderscored(v)}</option>
                          ))}
                        </select>
                        <select
                          value={betaFeedbackAgeFilter}
                          onChange={e => setBetaFeedbackAgeFilter(e.target.value)}
                          className="text-xs font-medium rounded-lg border border-slate-100 bg-white text-slate-600 px-2 py-1.5"
                        >
                          <option value="all">All ages</option>
                          {ageOptions.map(v => (
                            <option key={v} value={v}>{AGE_BRACKET_LABEL[v] || formatUnderscored(v)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
                      <table className="w-full text-sm min-w-[900px]">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50">
                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Country</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Age</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Stage</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Overall</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Would recommend</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                            <th className="px-4 py-3" />
                          </tr>
                        </thead>
                        <tbody>
                          {visibleBetaFeedback.map((bf, i) => {
                            const stageKey = betaFeedbackStageOf(bf)
                            const stage = BETA_FEEDBACK_STAGE_LABELS[stageKey]
                            return (
                              <tr key={bf.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                                <td className="px-4 py-3 font-medium text-slate-800">
                                  <span>{bf.assessment_responses?.full_name || '—'}</span>
                                  {cohortLabel({ created_at: bf.created_at, cohort_override: bf.assessment_responses?.cohort_override }) === 'beta v2' && (
                                    <span className="ml-2 text-xs font-semibold bg-lightblue text-primary px-1.5 py-0.5 rounded-full">beta v2</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-slate-500">{bf.assessment_responses?.email || '—'}</td>
                                <td className="px-4 py-3 text-slate-500">{bf.assessment_responses?.country || '—'}</td>
                                <td className="px-4 py-3 text-slate-500 capitalize">{formatUnderscored(bf.assessment_responses?.current_stage)}</td>
                                <td className="px-4 py-3 text-slate-500">{bf.assessment_responses?.age ?? (bf.assessment_responses?.age_bracket ? AGE_BRACKET_LABEL[bf.assessment_responses.age_bracket] || bf.assessment_responses.age_bracket : '—')}</td>
                                <td className="px-4 py-3">
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    stageKey === 'stage2' ? 'bg-green-50 text-green-700' :
                                    stageKey === 'result' ? 'bg-teal-50 text-teal-700' :
                                    stageKey === 'stage1' ? 'bg-amber-50 text-amber-600' :
                                    'bg-slate-100 text-slate-500'
                                  }`}>{stage}</span>
                                </td>
                                <td className="px-4 py-3 text-slate-500">
                                  {bf.overall_value ? (
                                    <span className="font-semibold text-slate-700">{bf.overall_value}<span className="text-slate-400 font-normal">/6</span></span>
                                  ) : '—'}
                                </td>
                                <td className="px-4 py-3 text-slate-500 capitalize">{bf.would_recommend?.replace(/_/g, ' ') || '—'}</td>
                                <td className="px-4 py-3 text-slate-400 text-xs">{new Date(bf.created_at).toLocaleDateString()}</td>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => setSelectedBetaFeedback(bf)}
                                    className="text-xs text-primary hover:underline font-medium"
                                  >
                                    View →
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                          {visibleBetaFeedback.length === 0 && (
                            <tr>
                              <td colSpan={10} className="px-4 py-12 text-center text-slate-400">No beta feedback yet</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                  )
                })()}
          </>
        )}

        {activeTab === 'betaBehavior' && (
          <>
            {telemetryLoading && (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {telemetryError && <p className="text-red-500 text-sm text-center py-8">{telemetryError}</p>}
            {!telemetryLoading && !telemetryError && (
              <TelemetryBehaviorView
                summary={betaTelemetrySummary}
                drilldown={telemetryDrilldown}
                onDrilldown={setTelemetryDrilldown}
                onCloseDrilldown={() => setTelemetryDrilldown(null)}
              />
            )}
          </>
        )}

        {activeTab === 'betaBugs' && (
          <>
            {bugReportsLoading && (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {bugReportsError && <p className="text-red-500 text-sm text-center py-8">{bugReportsError}</p>}
            {!bugReportsLoading && !bugReportsError && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <p className="text-sm text-slate-400">{visibleBugReports.length} report{visibleBugReports.length !== 1 ? 's' : ''}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <DownloadCSVButton onClick={exportBugReports} />
                    {(['open', 'resolved', 'all'] as const).map(key => (
                      <button
                        key={key}
                        onClick={() => setBugStatusFilter(key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                          bugStatusFilter === key ? 'bg-red-600 text-white' : 'bg-white text-slate-400 border border-slate-100 hover:text-slate-600'
                        }`}
                      >
                        {key}
                      </button>
                    ))}
                    <select
                      value={bugSourceFilter}
                      onChange={e => setBugSourceFilter(e.target.value as 'all' | 'user' | 'system')}
                      className="text-xs font-medium rounded-lg border border-slate-100 bg-white text-slate-600 px-2 py-1.5 capitalize"
                    >
                      <option value="all">All sources</option>
                      <option value="user">Reported by users</option>
                      <option value="system">Detected automatically</option>
                    </select>
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
                  <table className="w-full text-sm min-w-[1000px]">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Source</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Summary</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Who</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Page / Feature</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {visibleBugReports.map((b, i) => (
                        <tr key={b.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${b.source === 'user' ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-700'}`}>
                              {b.source === 'user' ? 'User report' : 'System'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 max-w-[360px] truncate">
                            {b.source === 'user' ? (b.description || '—') : `${b.error_type || 'Error'}: ${b.error_message || b.description || '—'}`}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{b.full_name || b.email || '—'}</td>
                          <td className="px-4 py-3 text-slate-500">{b.feature || b.page || '—'}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs">{new Date(b.created_at).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${b.status === 'open' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                              {b.status === 'open' ? 'Open' : 'Resolved'}
                            </span>
                          </td>
                          <td className="px-4 py-3 flex items-center gap-3">
                            <button
                              onClick={() => setSelectedBugReport(b)}
                              className="text-xs text-primary hover:underline font-medium"
                            >
                              View →
                            </button>
                            <button
                              onClick={() => setBugReportStatus(b.id, b.status === 'open' ? 'resolved' : 'open')}
                              className="text-xs text-slate-400 hover:text-slate-600 hover:underline"
                            >
                              {b.status === 'open' ? 'Resolve' : 'Reopen'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {visibleBugReports.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-slate-400">No bug reports here</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {selectedBugReport && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelectedBugReport(null)}>
                <div
                  className="relative bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-lg max-h-[80vh] flex flex-col"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-800">Bug report</h3>
                    <button onClick={() => setSelectedBugReport(null)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
                  </div>
                  <div className="overflow-y-auto px-6 py-4 space-y-3 text-sm">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
                      {[
                        ['Source', selectedBugReport.source === 'user' ? 'User report' : 'System'],
                        ['Status', selectedBugReport.status],
                        ['Who', selectedBugReport.full_name || selectedBugReport.email],
                        ['Email', selectedBugReport.email],
                        ['Feature', selectedBugReport.feature],
                        ['Page', selectedBugReport.page],
                        ['Locale', selectedBugReport.locale],
                        ['Device', selectedBugReport.device_type],
                        ['Response ID', selectedBugReport.response_id],
                        ['Date', new Date(selectedBugReport.created_at).toLocaleString()],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <dt className="text-slate-400 text-xs">{label}</dt>
                          <dd className="text-slate-800 font-medium break-words">{value || '—'}</dd>
                        </div>
                      ))}
                    </dl>
                    {selectedBugReport.description && (
                      <div>
                        <dt className="text-slate-400 text-xs mb-1">Description</dt>
                        <dd className="text-slate-800 whitespace-pre-wrap bg-slate-50 rounded-lg p-3">{selectedBugReport.description}</dd>
                      </div>
                    )}
                    {selectedBugReport.error_message && (
                      <div>
                        <dt className="text-slate-400 text-xs mb-1">Error</dt>
                        <dd className="text-slate-800 whitespace-pre-wrap bg-slate-50 rounded-lg p-3">{selectedBugReport.error_type}: {selectedBugReport.error_message}</dd>
                      </div>
                    )}
                    {selectedBugReport.stack_trace && (
                      <div>
                        <dt className="text-slate-400 text-xs mb-1">Stack trace</dt>
                        <dd className="text-slate-600 whitespace-pre-wrap font-mono text-[11px] bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto">{selectedBugReport.stack_trace}</dd>
                      </div>
                    )}
                  </div>
                  <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={() => setBugReportStatus(selectedBugReport.id, selectedBugReport.status === 'open' ? 'resolved' : 'open')}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                    >
                      {selectedBugReport.status === 'open' ? 'Mark resolved' : 'Reopen'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Waitlist Tab ── */}
        {activeTab === 'waitlist' && (
          <>
            {waitlistLoading && (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {waitlistError && <p className="text-red-500 text-sm text-center py-8">{waitlistError}</p>}
            {!waitlistLoading && !waitlistError && (
              <>
                <p className="text-sm text-slate-400 mb-4">{waitlistList.length} signup{waitlistList.length !== 1 ? 's' : ''}</p>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Country</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nationality</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Age</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Locale</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Source</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {waitlistList.map((w, i) => (
                        <tr key={w.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                          <td className="px-4 py-3 font-medium text-slate-800">{w.email}</td>
                          <td className="px-4 py-3 text-slate-500">{w.name || '—'}</td>
                          <td className="px-4 py-3 text-slate-500">{w.country || '—'}</td>
                          <td className="px-4 py-3 text-slate-500">{w.nationality || '—'}</td>
                          <td className="px-4 py-3 text-slate-500" dir="ltr">{w.phone || '—'}</td>
                          <td className="px-4 py-3 text-slate-500">{w.status ? (WAITLIST_STATUS_LABELS[w.status] || w.status) : '—'}</td>
                          <td className="px-4 py-3 text-slate-500">{w.age || '—'}</td>
                          <td className="px-4 py-3 text-slate-500 uppercase">{w.locale || '—'}</td>
                          <td className="px-4 py-3 text-slate-500">{w.source || '—'}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs">{new Date(w.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                      {waitlistList.length === 0 && (
                        <tr>
                          <td colSpan={10} className="px-4 py-12 text-center text-slate-400">No waitlist signups yet</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {/* ── O*NET Tab ── */}
        {activeTab === 'onet' && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
              <h2 className="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wide">Add O*NET Link</h2>
              <form onSubmit={handleAddOnet} className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs text-slate-500 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={onetEmail}
                    onChange={e => setOnetEmail(e.target.value)}
                    placeholder="user@email.com"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div className="flex-[2] min-w-[220px]">
                  <label className="block text-xs text-slate-500 mb-1">O*NET URL</label>
                  <input
                    type="url"
                    required
                    value={onetUrl}
                    onChange={e => setOnetUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs text-slate-500 mb-1">Label (optional)</label>
                  <input
                    type="text"
                    value={onetLabel}
                    onChange={e => setOnetLabel(e.target.value)}
                    placeholder="e.g. May 2026"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={onetAdding}
                  className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  {onetAdding && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Add
                </button>
              </form>
              {onetError && <p className="text-red-500 text-xs mt-2">{onetError}</p>}
            </div>

            {onetLoading && (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!onetLoading && (
              <>
                <p className="text-sm text-slate-400 mb-4">{onetLinks.length} link{onetLinks.length !== 1 ? 's' : ''}</p>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-40">Email</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-32">Name</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">Label</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">O*NET URL</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">Assessment</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">Added</th>
                        <th className="px-3 py-3 w-24" />
                      </tr>
                    </thead>
                    <tbody>
                      {onetLinks.map((link, i) => (
                        <tr key={link.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                          <td className="px-3 py-3 font-medium text-slate-800 truncate max-w-[160px]">{link.email}</td>
                          <td className="px-3 py-3 text-slate-600 truncate max-w-[128px]">{link.name || '—'}</td>
                          <td className="px-3 py-3 text-slate-500 truncate max-w-[96px]">{link.label || '—'}</td>
                          <td className="px-3 py-3 text-slate-500 truncate max-w-[180px]">
                            <a href={link.onet_url} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">
                              {link.onet_url}
                            </a>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${link.has_assessment ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                              {link.has_assessment ? 'Submitted' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-slate-400 text-xs">{new Date(link.created_at).toLocaleDateString()}</td>
                          <td className="px-3 py-3 flex items-center gap-3">
                            <button
                              onClick={() => setSelectedOnet(link)}
                              className="text-xs text-primary hover:underline font-medium"
                            >
                              View →
                            </button>
                            <button
                              onClick={() => handleDeleteOnet(link.id)}
                              className="text-xs text-red-400 hover:text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {onetLinks.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-slate-400">No O*NET links added yet</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {/* ── Coaching Sessions Tab ── */}
        {activeTab === 'coaching' && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
              <h2 className="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wide">Upload Coaching Transcript</h2>
              <form onSubmit={handleAddCoachingSession} className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Client Label (optional, anonymized)</label>
                    <input
                      type="text"
                      value={coachingForm.client_label}
                      onChange={e => setCoachingForm(prev => ({ ...prev, client_label: e.target.value }))}
                      placeholder="e.g. Client A"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Topic (optional)</label>
                    <input
                      type="text"
                      value={coachingForm.topic}
                      onChange={e => setCoachingForm(prev => ({ ...prev, topic: e.target.value }))}
                      placeholder="e.g. Career transition"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Session Date (optional)</label>
                    <input
                      type="date"
                      value={coachingForm.session_date}
                      onChange={e => setCoachingForm(prev => ({ ...prev, session_date: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Speaker-Labeled Transcript ("Coach:" / "Client:")</label>
                  <textarea
                    required
                    rows={10}
                    value={coachingForm.raw_transcript}
                    onChange={e => setCoachingForm(prev => ({ ...prev, raw_transcript: e.target.value }))}
                    placeholder={'Coach: So tell me, what\'s been on your mind...\nClient: Honestly, I\'ve been stuck on...'}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={coachingSubmitting}
                    className="bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
                  >
                    {coachingSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {coachingSubmitting ? 'Processing…' : 'Upload & Process'}
                  </button>
                  {coachingSuccess && <p className="text-green-600 text-sm">{coachingSuccess}</p>}
                  {coachingError && <p className="text-red-500 text-sm">{coachingError}</p>}
                </div>
              </form>
            </div>

            {coachingLoading && (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!coachingLoading && (
              <>
                <p className="text-sm text-slate-400 mb-4">{coachingSessions.length} session{coachingSessions.length !== 1 ? 's' : ''}</p>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Topic</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Session Date</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Uploaded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coachingSessions.map((s, i) => (
                        <tr key={s.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                          <td className="px-4 py-3 font-medium text-slate-800">{s.client_label || '—'}</td>
                          <td className="px-4 py-3 text-slate-500">{s.topic || '—'}</td>
                          <td className="px-4 py-3 text-slate-500">{s.session_date || '—'}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs">{new Date(s.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                      {coachingSessions.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-12 text-center text-slate-400">No coaching sessions uploaded yet</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {/* ── Courses Tab ── */}
        {activeTab === 'courses' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-400">{courses.length} course{courses.length !== 1 ? 's' : ''}</p>
              <button
                onClick={() => setShowCourseForm(v => !v)}
                className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                {showCourseForm ? 'Cancel' : '+ Add Course'}
              </button>
            </div>

            {showCourseForm && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
                <h2 className="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wide">New Course</h2>
                <form onSubmit={handleAddCourse} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      ['title', 'Title', 'text', true],
                      ['provider', 'Provider (e.g. Coursera)', 'text', true],
                      ['url', 'URL', 'url', true],
                      ['duration_hours', 'Duration (hours)', 'number', false],
                      ['country_code', 'Country Code (e.g. SA, BH — blank = global)', 'text', false],
                    ] as [string, string, string, boolean][]).map(([key, label, type, required]) => (
                      <div key={key}>
                        <label className="block text-xs text-slate-500 mb-1">{label}</label>
                        <input
                          type={type}
                          required={required}
                          value={(courseForm as any)[key]}
                          onChange={e => setCourseForm(prev => ({ ...prev, [key]: e.target.value }))}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Level</label>
                      <div className="relative">
                        <select
                          value={courseForm.level}
                          onChange={e => setCourseForm(prev => ({ ...prev, level: e.target.value }))}
                          className="w-full border border-slate-200 rounded-lg ps-3 pe-8 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400 appearance-none"
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                        <svg className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Language</label>
                      <div className="relative">
                        <select
                          value={courseForm.language}
                          onChange={e => setCourseForm(prev => ({ ...prev, language: e.target.value }))}
                          className="w-full border border-slate-200 rounded-lg ps-3 pe-8 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400 appearance-none"
                        >
                          <option value="en">English</option>
                          <option value="ar">Arabic</option>
                        </select>
                        <svg className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={courseForm.description}
                      onChange={e => setCourseForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                  {([
                    ['skill_tags', 'Skill Tags (comma-separated, e.g. leadership, communication)'],
                    ['career_tags', 'Career Tags (comma-separated, e.g. Product Manager, Data Analyst)'],
                    ['riasec_tags', 'RIASEC Tags (comma-separated, e.g. enterprising, investigative)'],
                  ] as [string, string][]).map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-xs text-slate-500 mb-1">{label}</label>
                      <input
                        type="text"
                        value={(courseForm as any)[key]}
                        onChange={e => setCourseForm(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
                      />
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_free"
                      checked={courseForm.is_free}
                      onChange={e => setCourseForm(prev => ({ ...prev, is_free: e.target.checked }))}
                      className="w-4 h-4 accent-violet-600"
                    />
                    <label htmlFor="is_free" className="text-sm text-slate-600">Free course</label>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={courseAdding}
                      className="bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
                    >
                      {courseAdding && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      Add Course
                    </button>
                  </div>
                  {coursesError && <p className="text-red-500 text-xs mt-1">{coursesError}</p>}
                </form>
              </div>
            )}

            {coursesLoading && (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!coursesLoading && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Provider</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Level</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Skill Tags</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Country</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Free?</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Lang</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((c, i) => (
                      <tr key={c.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          <a href={c.url} target="_blank" rel="noopener noreferrer" className="hover:text-violet-600 hover:underline">{c.title}</a>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{c.provider}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 capitalize">{c.level}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {c.skill_tags?.slice(0, 3).map(t => (
                              <span key={t} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{t}</span>
                            ))}
                            {(c.skill_tags?.length ?? 0) > 3 && (
                              <span className="text-xs text-slate-400">+{c.skill_tags.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {c.country_code
                            ? <span className="text-xs font-mono font-bold text-slate-700">{c.country_code}</span>
                            : <span className="text-xs text-slate-300">Global</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.is_free ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                            {c.is_free ? 'Free' : 'Paid'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 uppercase text-xs font-mono">{c.language}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDeleteCourse(c.id)}
                            className="text-xs text-red-400 hover:text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {courses.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-slate-400">No courses yet — add your first one above</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── Country Profiles Tab ── */}
        {activeTab === 'country' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-400">{countryProfiles.length} profile{countryProfiles.length !== 1 ? 's' : ''}</p>
              <button
                onClick={() => { setEditingCountry(null); setCountryForm({}); setShowCountryForm(true) }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                + Add Country
              </button>
            </div>

            {showCountryForm && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
                <h2 className="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wide">
                  {editingCountry ? `Edit — ${editingCountry.country_name}` : 'New Country Profile'}
                </h2>
                <form onSubmit={handleSaveCountry} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      ['country_code', 'Country Code (2-letter)', false],
                      ['country_name', 'Country Name (EN)', false],
                      ['country_name_ar', 'Country Name (AR)', true],
                      ['source_url_primary', 'Source URL', true],
                    ] as [string, string, boolean][]).map(([key, label, optional]) => (
                      <div key={key}>
                        <label className="block text-xs text-slate-500 mb-1">{label}</label>
                        <input
                          type="text"
                          required={!optional}
                          value={(countryForm as any)[key] ?? ''}
                          onChange={e => setCountryForm(prev => ({ ...prev, [key]: e.target.value }))}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Country Notes</label>
                    <p className="text-xs text-slate-400 mb-2">Paste any information about this country's labour market — government websites, news articles, reports, anything. The AI will use this when coaching users from this country and generating their reports.</p>
                    <textarea
                      rows={10}
                      value={(countryForm as any).raw_notes ?? ''}
                      onChange={e => setCountryForm(prev => ({ ...prev, raw_notes: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      placeholder="Paste any text about this country's job market, nationalisation policies, key industries, salary ranges, hiring trends..."
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors">
                      {editingCountry ? 'Save Changes' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowCountryForm(false); setEditingCountry(null); setCountryForm({}) }}
                      className="text-sm text-slate-400 hover:text-slate-600 px-3 py-2"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {countryLoading && (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {countryError && <p className="text-red-500 text-sm text-center py-8">{countryError}</p>}

            {!countryLoading && !countryError && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Code</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Country</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tier</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {countryProfiles.map((cp, i) => (
                      <tr key={cp.country_code} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                        <td className="px-4 py-3 font-mono font-bold text-slate-700">{cp.country_code}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{cp.country_name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${cp.context_tier === 'complete' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-600'}`}>
                            {cp.context_tier}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs truncate max-w-xs">
                          {(cp as any).raw_notes ? (cp as any).raw_notes.slice(0, 80) + '…' : <span className="text-slate-300">No notes yet</span>}
                        </td>
                        <td className="px-4 py-3 flex items-center gap-3">
                          <button
                            onClick={() => {
                              setEditingCountry(cp)
                              setCountryForm({ ...cp })
                              setShowCountryForm(true)
                            }}
                            className="text-xs text-primary hover:underline font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCountry(cp.country_code)}
                            className="text-xs text-red-400 hover:text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {countryProfiles.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-slate-400">No country profiles yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      {/* ── Market Analysis Tab ── */}
      {activeTab === 'market' && (
        <div className="max-w-6xl mx-auto px-4 py-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-slate-800">GCC Job Market Intelligence</h2>
              <p className="text-sm text-slate-400 mt-1">Saudi Arabia, UAE, Bahrain, Qatar, Kuwait &amp; Oman · 25 role categories · weekly snapshots</p>
            </div>
            <button
              onClick={triggerMarketFetch}
              disabled={marketFetching}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {marketFetching ? (<><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Fetching jobs…</>) : '↻ Fetch This Week'}
            </button>
          </div>

          {marketFetchResult && (
            <div className={`mb-5 px-4 py-3 rounded-xl text-sm ${marketFetchResult.error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
              {marketFetchResult.error ? `Error: ${marketFetchResult.error}` : `✓ Week ${marketFetchResult.week}: ${marketFetchResult.inserted} new jobs stored (${marketFetchResult.errors} errors)`}
            </div>
          )}

          {marketLoading && <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>}
          {marketError && <p className="text-red-500 text-sm text-center py-8">{marketError}</p>}

          {!marketLoading && !marketError && marketTrends && marketTrends.weeks?.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-8 py-20 text-center">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-slate-600 font-medium mb-1">No data yet</p>
              <p className="text-slate-400 text-sm">Click <strong>Fetch This Week</strong> to collect the first snapshot.</p>
            </div>
          )}

          {!marketLoading && !marketError && marketTrends && marketTrends.weeks?.length > 0 && (() => {
            const cf = marketCountryFilter
            const filteredDemand = (marketTrends.demand || []).filter((d: any) => cf === 'both' || d.country === cf)
            const filteredSalary = (marketTrends.salary || []).filter((s: any) => cf === 'both' || s.country === cf)
            const filteredJobs = (marketTrends.recent_jobs || []).filter((j: any) => cf === 'both' || j.country_code === cf)
            const filteredCompanies = cf === 'both'
              ? (marketTrends.top_companies || [])
              : (marketTrends.top_companies || []).filter((c: any) => c[cf] > 0).map((c: any) => ({...c, total: c[cf]})).sort((a: any, b: any) => b.total - a.total)

            const latestWeek = marketTrends.weeks[marketTrends.weeks.length - 1]
            const roleCount: Record<string, number> = {}
            for (const d of filteredDemand) {
              if (d.week === latestWeek) roleCount[d.role] = (roleCount[d.role] || 0) + d.count
            }
            const totalJobs = Object.values(roleCount).reduce((s: number, v) => s + (v as number), 0)
            const sortedRoles = [...(marketTrends.roles || [])].sort((a, b) => (roleCount[b] || 0) - (roleCount[a] || 0))
            const maxRoleCount = Math.max(...Object.values(roleCount).map(Number), 1)

            const salaryByRole: Record<string, number[]> = {}
            for (const s of filteredSalary) {
              if (!salaryByRole[s.role]) salaryByRole[s.role] = []
              salaryByRole[s.role].push(s.avg_salary_usd)
            }

            const maxCompanyCount = Math.max(...filteredCompanies.slice(0,10).map((c: any) => c.total), 1)

            return (
              <>
                {/* Country filter */}
                <div className="flex gap-3 mb-6 flex-wrap items-center">
                  <div className="flex gap-1 bg-slate-100 p-1 rounded-xl flex-wrap">
                    {(['both', 'SA', 'AE', 'BH', 'QA', 'KW', 'OM'] as const).map(c => (
                      <button key={c} onClick={() => setMarketCountryFilter(c)}
                        className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${marketCountryFilter === c ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        {c === 'both' ? 'All Countries' : { SA: '🇸🇦 Saudi Arabia', AE: '🇦🇪 UAE', BH: '🇧🇭 Bahrain', QA: '🇶🇦 Qatar', KW: '🇰🇼 Kuwait', OM: '🇴🇲 Oman' }[c]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* KPI row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Jobs Collected', value: marketTrends.total_snapshots?.toLocaleString(), sub: 'all time' },
                    { label: 'This Week', value: totalJobs.toLocaleString(), sub: latestWeek },
                    { label: 'Companies Hiring', value: (filteredCompanies.length || marketTrends.total_companies)?.toLocaleString(), sub: 'unique employers' },
                    { label: 'Weeks of Data', value: marketTrends.weeks.length, sub: `since ${marketTrends.weeks[0]}` },
                  ].map(kpi => (
                    <div key={kpi.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                      <p className="text-xs text-slate-400 font-medium mb-1">{kpi.label}</p>
                      <p className="text-2xl font-bold text-slate-800">{kpi.value}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{kpi.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Top Companies + Demand side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

                  {/* Top Hiring Companies */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h3 className="text-sm font-bold text-slate-700 mb-0.5">Top Hiring Companies</h3>
                    <p className="text-xs text-slate-400 mb-4">By total job postings collected</p>
                    <div className="space-y-2.5">
                      {filteredCompanies.slice(0, 10).map((c: any, i: number) => {
                        const pct = Math.round((c.total / maxCompanyCount) * 100)
                        return (
                          <div key={c.company} className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 w-4 shrink-0 text-right">{i+1}</span>
                            <span className="text-xs text-slate-700 w-32 shrink-0 truncate font-medium">{c.company}</span>
                            <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                              <div className="h-3 rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-slate-600 w-6 text-right">{c.total}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Demand by Role */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h3 className="text-sm font-bold text-slate-700 mb-0.5">Job Demand by Role</h3>
                    <p className="text-xs text-slate-400 mb-4">Latest week · {latestWeek}</p>
                    <div className="space-y-2">
                      {sortedRoles.map((role: string) => {
                        const count = roleCount[role] || 0
                        const pct = Math.round((count / maxRoleCount) * 100)
                        const salaryAvg = salaryByRole[role] ? Math.round(salaryByRole[role].reduce((s, v) => s + v, 0) / salaryByRole[role].length) : null
                        return (
                          <div key={role} className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 w-32 shrink-0 capitalize">{role}</span>
                            <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                              <div className="h-3 rounded-full bg-amber-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-slate-600 w-5 text-right">{count}</span>
                            {salaryAvg && <span className="text-[10px] text-slate-400 w-16 text-right hidden md:block">${salaryAvg.toLocaleString()}</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* SA vs BH comparison */}
                {cf === 'both' && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
                    <h3 className="text-sm font-bold text-slate-700 mb-0.5">Saudi Arabia vs Bahrain</h3>
                    <p className="text-xs text-slate-400 mb-4">Job postings per role this week</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="text-left px-2 py-2 text-slate-400 font-medium">Role</th>
                            <th className="text-center px-2 py-2 text-primary font-semibold">🇸🇦 SA</th>
                            <th className="text-center px-2 py-2 text-emerald-600 font-semibold">🇧🇭 BH</th>
                            <th className="text-center px-2 py-2 text-slate-400 font-medium">Total</th>
                            <th className="text-center px-2 py-2 text-slate-400 font-medium">Leader</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedRoles.map((role: string) => {
                            const sa = (marketTrends.demand || []).find((d: any) => d.role === role && d.country === 'SA' && d.week === latestWeek)?.count || 0
                            const bh = (marketTrends.demand || []).find((d: any) => d.role === role && d.country === 'BH' && d.week === latestWeek)?.count || 0
                            const total = sa + bh
                            if (total === 0) return null
                            return (
                              <tr key={role} className="border-b border-slate-50 hover:bg-slate-50">
                                <td className="px-2 py-2 capitalize text-slate-700 font-medium">{role}</td>
                                <td className="px-2 py-2 text-center font-semibold text-primary">{sa}</td>
                                <td className="px-2 py-2 text-center font-semibold text-emerald-700">{bh}</td>
                                <td className="px-2 py-2 text-center text-slate-600">{total}</td>
                                <td className="px-2 py-2 text-center">{sa > bh ? '🇸🇦' : bh > sa ? '🇧🇭' : '='}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Trend over time */}
                {marketTrends.weeks.length > 1 && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
                    <h3 className="text-sm font-bold text-slate-700 mb-0.5">Weekly Volume Trend</h3>
                    <p className="text-xs text-slate-400 mb-4">Total job postings collected per week</p>
                    <div className="flex items-end gap-2" style={{ height: '100px' }}>
                      {marketTrends.weeks.map((week: string) => {
                        const total = filteredDemand.filter((d: any) => d.week === week).reduce((s: number, d: any) => s + d.count, 0)
                        const maxTotal = Math.max(...marketTrends.weeks.map((w: string) => filteredDemand.filter((d: any) => d.week === w).reduce((s: number, d: any) => s + d.count, 0)), 1)
                        const pct = Math.round((total / maxTotal) * 100)
                        return (
                          <div key={week} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[10px] text-slate-500">{total}</span>
                            <div className="w-full bg-slate-100 rounded-t-lg flex items-end" style={{ height: '72px' }}>
                              <div className="w-full bg-amber-400 rounded-t-lg transition-all duration-500" style={{ height: `${pct}%` }} />
                            </div>
                            <span className="text-[9px] text-slate-400">{week.slice(5)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Salary insights */}
                {Object.keys(salaryByRole).length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
                    <h3 className="text-sm font-bold text-slate-700 mb-0.5">Salary Insights by Role</h3>
                    <p className="text-xs text-slate-400 mb-4">Average monthly salary in USD, across all collected listings where salary was disclosed</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(salaryByRole)
                        .map(([role, vals]) => ({ role, avg: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length), count: vals.length }))
                        .sort((a, b) => b.avg - a.avg)
                        .map(({ role, avg, count }) => (
                          <div key={role} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <p className="text-xs text-slate-500 capitalize mb-1">{role}</p>
                            <p className="text-lg font-bold text-slate-800">${avg.toLocaleString()}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{count} data point{count !== 1 ? 's' : ''}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Recent job listings */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                  <h3 className="text-sm font-bold text-slate-700 mb-0.5">Recent Job Listings</h3>
                  <p className="text-xs text-slate-400 mb-4">Latest 50 jobs collected — click to view posting</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate-400">Job Title</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate-400">Company</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate-400">Category</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate-400">Location</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate-400">Salary</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate-400">Country</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredJobs.map((job: any, i: number) => (
                          <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 group">
                            <td className="px-3 py-2 max-w-[200px]">
                              {job.url ? (
                                <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium line-clamp-1">{job.job_title || '—'}</a>
                              ) : (
                                <span className="font-medium text-slate-700 line-clamp-1">{job.job_title || '—'}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-slate-600 max-w-[140px] truncate">{job.company || '—'}</td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md text-xs capitalize">{job.role_category}</span>
                            </td>
                            <td className="px-3 py-2 text-slate-500 text-xs">{job.location || '—'}</td>
                            <td className="px-3 py-2 text-slate-600 text-xs">
                              {job.salary_min || job.salary_max
                                ? `${job.salary_min ? job.salary_min.toLocaleString() : '?'} – ${job.salary_max ? job.salary_max.toLocaleString() : '?'} ${job.salary_currency || ''}`
                                : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-3 py-2 text-sm">{job.country_code === 'SA' ? '🇸🇦' : '🇧🇭'}</td>
                          </tr>
                        ))}
                        {filteredJobs.length === 0 && (
                          <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400 text-sm">No jobs found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      )}

      {/* ── Test Mode Tab ── */}
      {activeTab === 'testmode' && (
        <div className="max-w-2xl mx-auto px-4 py-8">
          <h2 className="text-xl font-bold text-slate-800 mb-1">Test Mode</h2>
          <p className="text-sm text-slate-400 mb-6">
            When enabled, every user — regardless of what plan they've actually bought, including anonymous
            visitors — gets treated as the top tier everywhere: full reports, full AI-impact deep dive, courses,
            target companies, and daily job matches. Use this to walk the full paid experience without a real
            purchase, then turn it back off.
          </p>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-800">
                  All plans unlocked {testModeEnabled ? <span className="text-cyan-600">(ON)</span> : <span className="text-slate-400">(OFF)</span>}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Affects production immediately for every visitor — not just your own admin session.</p>
              </div>
              <button
                role="switch"
                aria-checked={testModeEnabled}
                disabled={testModeLoading || testModeSaving}
                onClick={() => toggleTestMode(!testModeEnabled)}
                className={`relative w-12 h-7 rounded-full transition-colors shrink-0 disabled:opacity-50 ${testModeEnabled ? 'bg-cyan-600' : 'bg-slate-200'}`}
              >
                <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all ${testModeEnabled ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
            {testModeError && <p className="text-xs text-red-500 mt-3">{testModeError}</p>}
          </div>
        </div>
      )}

      {/* ── Homepage Tab ── */}
      {activeTab === 'homepage' && (
        <div className="max-w-2xl mx-auto px-4 py-8">
          <h2 className="text-xl font-bold text-slate-800 mb-1">Homepage</h2>
          <p className="text-sm text-slate-400 mb-6">
            Choose which page visitors land on at the site root ("/"). Both pages stay live regardless —
            the landing page is always reachable at <span className="font-mono">/landing</span> and the waitlist at{' '}
            <span className="font-mono">/waitlist</span> — this just picks which one owns "/".
          </p>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between gap-4 mb-1">
              <div>
                <p className="font-semibold text-slate-800">
                  Currently serving{' '}
                  <span className="text-fuchsia-600 capitalize">{homepageMode}</span>{' '}
                  at "/"
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Affects production immediately for every visitor.</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                disabled={homepageModeLoading || homepageModeSaving}
                onClick={() => toggleHomepageMode('landing')}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                  homepageMode === 'landing' ? 'bg-fuchsia-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Landing Page
              </button>
              <button
                disabled={homepageModeLoading || homepageModeSaving}
                onClick={() => toggleHomepageMode('waitlist')}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                  homepageMode === 'waitlist' ? 'bg-fuchsia-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Waitlist Page
              </button>
            </div>
            {homepageModeError && <p className="text-xs text-red-500 mt-3">{homepageModeError}</p>}
          </div>
        </div>
      )}

      {/* ── AI Provider Tab ── */}
      {activeTab === 'aiprovider' && (
        <div className="max-w-2xl mx-auto px-4 py-8">
          <h2 className="text-xl font-bold text-slate-800 mb-1">AI Provider</h2>
          <p className="text-sm text-slate-400 mb-6">
            Chooses which LLM writes report narratives, the AI-impact analysis, and Arabic
            translations. Affects new report generations immediately — already-generated
            reports are unchanged. Career-matching search (embeddings) always uses Gemini
            regardless of this setting, since Claude has no embeddings API; the AI coaching
            chat already runs on Claude and isn&apos;t affected either.
          </p>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between gap-4 mb-1">
              <div>
                <p className="font-semibold text-slate-800">
                  Currently using{' '}
                  <span className="text-orange-600 capitalize">{aiProvider}</span>{' '}
                  for reports
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Affects production immediately for every new report.</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                disabled={aiProviderLoading || aiProviderSaving}
                onClick={() => toggleAiProvider('gemini')}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                  aiProvider === 'gemini' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Gemini
              </button>
              <button
                disabled={aiProviderLoading || aiProviderSaving}
                onClick={() => toggleAiProvider('claude')}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                  aiProvider === 'claude' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Claude
              </button>
            </div>
            {aiProviderError && <p className="text-xs text-red-500 mt-3">{aiProviderError}</p>}
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="px-4 py-8">
          <EmailTemplatesTab />
        </div>
      )}

      {activeTab === 'emailScheduler' && (
        <div className="px-4 py-8">
          <EmailSchedulerTab />
        </div>
      )}

      {activeTab === 'smtp' && (
        <div className="px-4 py-8">
          <SmtpSettingsTab />
        </div>
      )}

      </div>
    </div>
  )
}
