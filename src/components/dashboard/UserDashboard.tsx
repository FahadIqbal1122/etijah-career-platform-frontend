'use client'

// UserDashboard — Etijahi logged-in "home base", matching the UFUQ design:
// sidebar app-shell (Home · My Report · Job Matches · Account · Notifications),
// welcome + report-status + quick stats + billing + notifications + account.
// Real data (assessments, top match, job tracker) is wired; features with no
// backend yet (paid tiers, daily job matching, notification persistence) are
// shown as clearly-labelled previews so nothing pretends to work.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter as useNavRouter, useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { useRouter, usePathname, Link } from '@/i18n/navigation'
import { supabase } from '@/lib/supabase'
import { apiAuthGet, apiAuthGetBlob, apiAuthPost, apiAuthPatch, apiAuthDelete, apiGet, startCheckout, type PlanCode } from '@/lib/api'
import Logomark from '@/components/brand/Logomark'
import { LockedSection } from '@/components/shared/LockedSection'

type Application = {
  id: string; job_title: string; company: string | null; location: string | null
  source: string | null; url: string | null; matched_career: string | null
  status: 'saved' | 'applied' | 'interview' | 'offer' | 'rejected'; created_at: string
}
type AssessmentSummary = {
  id: string; full_name: string; country: string; completed: boolean; created_at: string; top_type: string | null
}
type Plan = {
  tier: 'free' | 'pathfinder' | 'launchpad'
  pathfinder_unlocked: boolean
  pathfinder_unlocked_at: string | null
  subscription_plan_code: string | null
  subscription_status: string | null
  subscription_current_period_end: string | null
}
type Transaction = { order_ref: string; plan_code: string; amount: number; currency: string; status: string; created_at: string }
type JobMatch = {
  id: string
  matched_at: string
  job_data: { title: string; company: string | null; location: string | null; source: string | null; url: string | null; matched_career: string | null }
}

const STAGES: { key: Application['status']; label: string }[] = [
  { key: 'saved', label: 'Saved' }, { key: 'applied', label: 'Applied' },
  { key: 'interview', label: 'Interview' }, { key: 'offer', label: 'Offer' }, { key: 'rejected', label: 'Rejected' },
]

const NAV: { id: string; icon: string; en: string; ar: string; locked?: boolean }[] = [
  { id: 'home', icon: 'home', en: 'Home', ar: 'الرئيسية' },
  { id: 'report', icon: 'report', en: 'My Report', ar: 'تقريري' },
  { id: 'jobs', icon: 'jobs', en: 'Job Matches', ar: 'الوظائف المطابقة', locked: true },
  { id: 'account', icon: 'user', en: 'Account', ar: 'الحساب' },
  { id: 'notifications', icon: 'bell', en: 'Notifications', ar: 'الإشعارات' },
]

const T = {
  en: {
    welcome: 'Welcome back,', explorer: 'Explorer', preview: 'Preview',
    reportReadyEyebrow: 'Your report', reportReadyHead: 'Your full report is ready',
    reportReadySub: 'Career matches · AI impact · courses · companies to target',
    viewReport: 'View report', download: 'Download PDF', downloading: 'Downloading…',
    noReportHead: 'You haven’t taken the assessment yet', noReportSub: 'It takes about 15 minutes and it’s free.',
    startAssessment: 'Start the assessment',
    statCompleted: 'Assessment completed', statMatch: 'Top career match', statRetake: 'Recommended retake',
    jobsHead: 'Job Matches', jobsLockedHead: 'Daily job matching is coming', notBuilt: 'Not available yet',
    jobsLockedBody: 'Soon Etijahi will match you to live GCC openings every day and review your CV against each one.',
    jobsBullets: ['Daily job matching from real openings', 'CV analysis against every role', 'Interview prep tied to your profile'],
    trackerHead: 'Your saved jobs', trackerSub: 'Jobs you save from your results, tracked through to offer.',
    trackerEmpty: 'No saved jobs yet. Save jobs from your results page and track them here.',
    comingSoonHead: 'More on the way', comingSoon: 'Coming Soon',
    cvHead: 'CV rebuild', cvBody: 'Your CV rebuilt around your real strengths, with ATS keyword optimisation — coming soon.',
    whatsappHead: 'WhatsApp delivery', whatsappBody: 'Job matches and updates delivered straight to WhatsApp — coming soon.',
    outreachHead: 'Outreach lists', outreachBody: 'Your full target list of 50+ companies with personalised outreach emails — coming soon.',
    interviewHead: 'Interview practice', interviewBody: 'Unlimited mock interviews with role-specific questions and scored feedback — coming soon.',
    billingHead: 'Subscription & billing', currentPlan: 'Current plan', free: 'Free', always: 'Always',
    upgradeSoon: 'Paid tiers coming soon', paymentLabel: 'Payment methods',
    notifHead: 'Notifications', notifSub: 'Choose what we send you. (Preview — not saved yet.)',
    accountHead: 'Account', fName: 'Name', fEmail: 'Email', fCountry: 'Country', fLang: 'Language',
    retake: 'Retake assessment', contactHead: 'Need help?', contactSub: 'Our team is here for you.',
    signOut: 'Sign out',
  },
  ar: {
    welcome: 'مرحباً بعودتك،', explorer: 'المُكتشِف', preview: 'معاينة',
    reportReadyEyebrow: 'تقريرك', reportReadyHead: 'تقريرك الكامل جاهز',
    reportReadySub: 'مسارات مهنية · أثر الذكاء الاصطناعي · دورات · شركات مستهدفة',
    viewReport: 'عرض التقرير', download: 'تحميل PDF', downloading: 'جاري التحميل…',
    noReportHead: 'لم تُجرِ التقييم بعد', noReportSub: 'يستغرق حوالي ١٥ دقيقة وهو مجاني.',
    startAssessment: 'ابدأ التقييم',
    statCompleted: 'اكتمل التقييم', statMatch: 'أفضل مسار مهني', statRetake: 'إعادة التقييم المقترحة',
    jobsHead: 'الوظائف المطابقة', jobsLockedHead: 'المطابقة اليومية للوظائف قادمة', notBuilt: 'غير متاحة بعد',
    jobsLockedBody: 'قريباً ستطابقك إتجاهي مع الوظائف المتاحة في الخليج يومياً وتراجع سيرتك الذاتية مع كل وظيفة.',
    jobsBullets: ['مطابقة يومية من فرص حقيقية', 'تحليل سيرتك مع كل وظيفة', 'تحضير للمقابلات مرتبط بملفّك'],
    trackerHead: 'وظائفك المحفوظة', trackerSub: 'الوظائف التي تحفظها من نتائجك، متابَعة حتى العرض.',
    trackerEmpty: 'لا توجد وظائف محفوظة بعد. احفظ الوظائف من صفحة نتائجك وتابعها هنا.',
    comingSoonHead: 'المزيد قريباً', comingSoon: 'قريباً',
    cvHead: 'إعادة بناء السيرة الذاتية', cvBody: 'إعادة بناء سيرتك الذاتية لتبرز نقاط قوتك، مع تحسينها لأنظمة فرز السير الذاتية — قريباً.',
    whatsappHead: 'التسليم عبر واتساب', whatsappBody: 'فرص العمل والتحديثات تصل مباشرة إلى واتساب — قريباً.',
    outreachHead: 'قوائم التواصل', outreachBody: 'قائمتك الكاملة (+٥٠ شركة) مع رسائل تواصل مخصصة — قريباً.',
    interviewHead: 'تدريب المقابلات', interviewBody: 'تدريب غير محدود على المقابلات بأسئلة مخصصة لكل وظيفة وتقييم دقيق — قريباً.',
    billingHead: 'الاشتراك والفوترة', currentPlan: 'الباقة الحالية', free: 'مجاناً', always: 'دائماً',
    upgradeSoon: 'الباقات المدفوعة قريباً', paymentLabel: 'وسائل الدفع',
    notifHead: 'الإشعارات', notifSub: 'اختر ما نرسله إليك. (معاينة — غير محفوظة بعد.)',
    accountHead: 'الحساب', fName: 'الاسم', fEmail: 'البريد الإلكتروني', fCountry: 'الدولة', fLang: 'اللغة',
    retake: 'إعادة إجراء التقييم', contactHead: 'تحتاج مساعدة؟', contactSub: 'فريقنا هنا لأجلك.',
    signOut: 'تسجيل الخروج',
  },
} as const

const NOTIF = [
  { id: 'jobEmail', en: 'Monthly job market email', ar: 'بريد سوق العمل الشهري', on: true },
  { id: 'reportUpd', en: 'Report updates', ar: 'تحديثات التقرير', on: true },
  { id: 'whatsapp', en: 'WhatsApp community updates', ar: 'تحديثات مجتمع واتساب', on: false },
]
const PAYMENTS = ['mada', 'Apple Pay', 'STC Pay', 'Benefit']

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const paths: Record<string, ReactNode> = {
    home: <><path d="M4 11.5 12 4l8 7.5" /><path d="M6 10v9.5h12V10" /></>,
    report: <><rect x="5" y="3" width="14" height="18" rx="2.5" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
    jobs: <><rect x="3.5" y="7" width="17" height="13" rx="2.5" /><path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7" /></>,
    user: <><circle cx="12" cy="8.5" r="3.6" /><path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5" /></>,
    bell: <><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 19a2 2 0 0 0 4 0" /></>,
    lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
    check: <path d="M5 13l4 4L19 7" />, target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.4" /></>,
    refresh: <><path d="M20 11a8 8 0 1 0-.7 4.5" /><path d="M20 5v6h-6" /></>, arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  }
  return <svg {...p} aria-hidden="true">{paths[name]}</svg>
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={onClick}
      className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${on ? 'bg-teal' : 'bg-[var(--line-strong)]'}`}>
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${on ? 'start-[18px]' : 'start-0.5'}`} />
    </button>
  )
}

function daysBetween(a: Date, b: Date) { return Math.round((b.getTime() - a.getTime()) / 86_400_000) }

function TierPill({ label }: { label: string }) {
  return <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/15 text-white border border-white/20">{label}</span>
}
function PreviewTag({ label }: { label: string }) {
  return <span className="chip !bg-amber-50 !text-amber-700 !border-amber-200 !py-0.5 !text-[10px] uppercase tracking-wide">{label}</span>
}
function NavList({ variant, active, lang, onNav }: { variant: 'side' | 'tab'; active: string; lang: 'en' | 'ar'; onNav: (id: string) => void }) {
  return (
    <>
      {NAV.map(item => {
        const on = active === item.id
        if (variant === 'tab') {
          return (
            <button key={item.id} onClick={() => onNav(item.id)}
              className={`flex flex-col items-center gap-0.5 flex-1 py-2 text-[10px] font-medium ${on ? 'text-primary' : 'text-charcoal/50'}`}>
              <span className="relative"><Icon name={item.icon} size={22} />{item.locked && <span className="absolute -top-1 -end-1 text-charcoal/40"><Icon name="lock" size={11} /></span>}</span>
              {item[lang]}
            </button>
          )
        }
        return (
          <button key={item.id} onClick={() => onNav(item.id)}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${on ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10'}`}>
            <Icon name={item.icon} size={20} />
            <span className="flex-1 text-start">{item[lang]}</span>
            {item.locked && <span className="text-white/40"><Icon name="lock" size={14} /></span>}
          </button>
        )
      })}
    </>
  )
}

export default function UserDashboard() {
  const locale = useLocale()
  const dir = locale === 'ar' ? 'rtl' : 'ltr'
  const t = T[locale === 'ar' ? 'ar' : 'en']
  const navRouter = useNavRouter()
  const router = useRouter()
  const pathname = usePathname()

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [plan, setPlan] = useState<Plan | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([])
  const [buying, setBuying] = useState(false)
  const [topMatch, setTopMatch] = useState<string | null>(null)
  const [notifs, setNotifs] = useState(NOTIF.map(n => n.on))
  const [active, setActive] = useState('home')
  const [error, setError] = useState('')
  const [downloadingReport, setDownloadingReport] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navRouter.push(`/${locale}/login`); return }
      setUser(session.user); setLoading(false)
    })
  }, [navRouter, locale])

  useEffect(() => {
    if (!user) return
    apiAuthGet<Application[]>('/applications').then(setApplications).catch(() => {})
    apiAuthGet<Plan>('/billing/plan').then(setPlan).catch(() => {})
    apiAuthGet<Transaction[]>('/billing/transaction').then(setTransactions).catch(() => {})
    apiAuthGet<JobMatch[]>('/jobs/my-matches').then(setJobMatches).catch(() => {})
    apiAuthGet<AssessmentSummary[]>('/assessment/my-assessments')
      .then(list => {
        const sorted = [...list].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
        setAssessments(sorted)
        const latest = sorted[0]
        if (latest) {
          apiGet<any>(`/assessment/${latest.id}/career-suggestions`)
            .then(d => setTopMatch(d.suggestions?.[0]?.title ?? null)).catch(() => {})
        }
      })
      .catch(() => {})
  }, [user])

  async function moveStage(id: string, status: Application['status']) {
    try { const u = await apiAuthPatch<Application>(`/applications/${id}`, { status }); setApplications(p => p.map(a => a.id === id ? u : a)) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to update') }
  }
  async function removeApplication(id: string) {
    try { await apiAuthDelete(`/applications/${id}`); setApplications(p => p.filter(a => a.id !== id)) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to remove') }
  }
  async function handleLogout() { await supabase.auth.signOut(); navRouter.push(`/${locale}/login`) }
  async function downloadReport(id: string) {
    setDownloadingReport(true)
    setDownloadError('')
    try {
      const { blob, filename } = await apiAuthGetBlob(`/assessment/${id}/report`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename || 'career-report.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      setDownloadError(e instanceof Error ? e.message : 'Failed to download report')
    } finally {
      setDownloadingReport(false)
    }
  }
  async function handleBuyPlan(planCode: PlanCode) {
    setBuying(true)
    try {
      const { checkout_url } = await startCheckout(planCode)
      window.location.href = checkout_url
    } catch (e: unknown) {
      setBuying(false)
      setError(e instanceof Error ? e.message : 'Could not start checkout')
    }
  }

  const searchParams = useSearchParams()
  useEffect(() => {
    if (!user) return
    const buy = searchParams.get('buy')
    if (buy === 'pathfinder' || buy === 'launchpad_monthly' || buy === 'launchpad_yearly') {
      navRouter.replace(`/${locale}/dashboard`)
      handleBuyPlan(buy)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  function go(id: string) {
    setActive(id)
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loading) {
    return <div className="min-h-screen brand-surface flex items-center justify-center"><div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
  }

  const latest = assessments[0]
  const fullName = latest?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'
  const firstName = String(fullName).trim().split(' ')[0]
  const topType = latest?.top_type
  const completedDate = latest ? new Date(latest.created_at) : null
  const retakeDays = completedDate ? 365 - daysBetween(completedDate, new Date()) : null
  const dateFmt = (d: Date) => d.toLocaleDateString(locale === 'ar' ? 'ar' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  const stats = [
    { icon: 'check', label: t.statCompleted, value: completedDate ? dateFmt(completedDate) : '—' },
    { icon: 'target', label: t.statMatch, value: topMatch || (topType ? `${topType} type` : '—'), accent: true },
    { icon: 'refresh', label: t.statRetake, value: retakeDays != null ? (locale === 'ar' ? `بعد ${Math.max(0, retakeDays)} يوماً` : `in ${Math.max(0, retakeDays)} days`) : '—' },
  ]

  const lang = locale === 'ar' ? 'ar' : 'en'

  return (
    <div className="min-h-screen brand-surface" dir={dir}>
      {/* desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 start-0 w-64 flex-col brand-hero px-4 py-6 z-30">
        <div className="px-2 mb-8"><Logomark size={38} tone="dark" glow /></div>
        <nav className="flex-1 space-y-1"><NavList variant="side" active={active} lang={lang} onNav={go} /></nav>
        <div className="flex items-center gap-3 border-t border-white/15 pt-4 mt-4">
          <span className="w-9 h-9 rounded-full bg-teal text-charcoal font-bold grid place-items-center shrink-0">{String(firstName)[0]?.toUpperCase()}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{fullName}</p>
            <TierPill label={t.explorer} />
          </div>
          <button onClick={handleLogout} title={t.signOut} className="ms-auto text-white/50 hover:text-white text-xs">✕</button>
        </div>
      </aside>

      {/* main */}
      <div className="md:ms-64">
        <main ref={mainRef} className="max-w-3xl mx-auto px-4 md:px-8 py-8 pb-28 md:pb-12 space-y-5">

          {/* welcome */}
          <header id="sec-home" className="flex items-center justify-between gap-4 flex-wrap scroll-mt-4">
            <div>
              <h1 className="text-2xl font-extrabold text-charcoal">{t.welcome} {firstName}</h1>
              {topType && <span className="chip chip-teal capitalize mt-2">✦ {topType} type</span>}
            </div>
          </header>

          {/* report status */}
          <section id="sec-report" className="card p-6 scroll-mt-4">
            {latest ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="eyebrow">{t.reportReadyEyebrow}</span>
                  <Logomark size={34} />
                </div>
                <h2 className="text-xl font-extrabold text-charcoal mt-2">{t.reportReadyHead}</h2>
                <p className="text-sm text-charcoal/60 mt-1">{t.reportReadySub}</p>
                <div className="flex flex-wrap gap-3 mt-5">
                  <Link href={`/results/${latest.id}`} className="cta" style={{ padding: '11px 18px', fontSize: 14, borderRadius: 12 }}>
                    <span>{t.viewReport}</span><span className="cta-arrow">{dir === 'rtl' ? '←' : '→'}</span>
                  </Link>
                  <button onClick={() => downloadReport(latest.id)} disabled={downloadingReport}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--line-strong)] text-charcoal/70 text-sm font-medium hover:bg-lightblue transition-colors disabled:opacity-50">
                    <Icon name="report" size={16} />{downloadingReport ? t.downloading : t.download}
                  </button>
                </div>
                {downloadError && <p className="text-rose-500 text-xs mt-2">{downloadError}</p>}
              </>
            ) : (
              <div className="text-center py-4">
                <div className="flex justify-center mb-3"><Logomark size={40} /></div>
                <h2 className="text-lg font-extrabold text-charcoal">{t.noReportHead}</h2>
                <p className="text-sm text-charcoal/60 mt-1 mb-5">{t.noReportSub}</p>
                <Link href="/assessment" className="cta cta-teal">{t.startAssessment}</Link>
              </div>
            )}
          </section>

          {/* quick stats */}
          {latest && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {stats.map(s => (
                <div key={s.label} className="card p-4">
                  <span className="text-primary"><Icon name={s.icon} size={18} /></span>
                  <p className="text-xs text-charcoal/50 mt-2">{s.label}</p>
                  <p className={`text-sm font-bold mt-0.5 capitalize ${s.accent ? 'text-teal' : 'text-charcoal'}`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* job matches: real for Launchpad, locked preview otherwise */}
          <section id="sec-jobs" className="space-y-4 scroll-mt-4">
            {plan?.tier === 'launchpad' ? (
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-1"><span className="eyebrow !text-primary">{t.jobsHead}</span></div>
                <p className="text-xs text-charcoal/45 mb-4">Refreshed daily from live GCC openings matched to your top careers.</p>
                {jobMatches.length === 0 ? (
                  <p className="text-sm text-charcoal/50 py-4 text-center">No matches yet — check back after the next daily refresh.</p>
                ) : (
                  <div className="space-y-2">
                    {jobMatches.map(m => (
                      <a key={m.id} href={m.job_data.url || '#'} target="_blank" rel="noopener noreferrer"
                        className="flex items-start justify-between gap-3 border border-[var(--line)] rounded-xl p-3.5 hover:border-[var(--line-strong)] hover:bg-lightblue/50 transition-colors group">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-charcoal group-hover:text-primary truncate">{m.job_data.title}</p>
                          <p className="text-xs text-charcoal/50 truncate">{m.job_data.company}{m.job_data.location ? ` · ${m.job_data.location}` : ''}</p>
                        </div>
                        <span className="chip !py-0.5 !text-[11px] shrink-0">{new Date(m.matched_at).toLocaleDateString()}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="card p-6 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-1"><span className="text-primary"><Icon name="lock" size={18} /></span><span className="eyebrow !text-primary">{t.jobsHead}</span><PreviewTag label={t.preview} /></div>
                <h3 className="text-lg font-extrabold text-charcoal">{t.jobsLockedHead}</h3>
                <p className="text-sm text-charcoal/60 mt-1">{t.jobsLockedBody}</p>
                <ul className="mt-3 space-y-1.5">
                  {t.jobsBullets.map(b => <li key={b} className="flex items-start gap-2 text-sm text-charcoal/70"><span className="text-teal mt-0.5"><Icon name="check" size={14} /></span>{b}</li>)}
                </ul>
                <button onClick={() => handleBuyPlan('launchpad_monthly')} disabled={buying}
                  className="cta cta-teal inline-flex mt-4" style={{ padding: '9px 16px', fontSize: 13, borderRadius: 999 }}>
                  {buying ? '…' : 'Subscribe to Launchpad'}
                </button>
              </div>
            )}

            <div className="card p-5">
              <h3 className="font-bold text-charcoal">{t.trackerHead}</h3>
              <p className="text-xs text-charcoal/45 mb-4">{t.trackerSub}</p>
              {error && <p className="text-rose-500 text-sm mb-3">{error}</p>}
              {applications.length === 0 ? (
                <p className="text-sm text-charcoal/50 py-4 text-center">{t.trackerEmpty}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {STAGES.map(stage => {
                    const apps = applications.filter(a => a.status === stage.key)
                    return (
                      <div key={stage.key} className="rounded-xl border border-[var(--line)] p-3 bg-lightblue/40">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-bold text-charcoal">{stage.label}</h4>
                          <span className="text-[10px] font-medium bg-white text-primary px-1.5 py-0.5 rounded-full">{apps.length}</span>
                        </div>
                        <div className="space-y-2">
                          {apps.map(app => (
                            <div key={app.id} className="bg-white border border-[var(--line)] rounded-lg p-2.5">
                              <p className="text-xs font-bold text-charcoal truncate">{app.job_title}</p>
                              <p className="text-[11px] text-charcoal/50 truncate">{app.company}{app.location ? ` · ${app.location}` : ''}</p>
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <select value={app.status} onChange={e => moveStage(app.id, e.target.value as Application['status'])}
                                  className="text-[11px] border border-[var(--line-strong)] rounded-md px-1 py-0.5 flex-1 bg-white">
                                  {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                                </select>
                                <button onClick={() => removeApplication(app.id)} className="text-charcoal/40 hover:text-rose-500 text-xs" title="Remove">✕</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-bold text-charcoal mb-3">{t.comingSoonHead}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <LockedSection tag={t.comingSoon} title={t.cvHead} body={t.cvBody} footer={t.notBuilt} />
                <LockedSection tag={t.comingSoon} title={t.whatsappHead} body={t.whatsappBody} footer={t.notBuilt} />
                <LockedSection tag={t.comingSoon} title={t.outreachHead} body={t.outreachBody} footer={t.notBuilt} />
                <LockedSection tag={t.comingSoon} title={t.interviewHead} body={t.interviewBody} footer={t.notBuilt} />
              </div>
            </div>
          </section>

          {/* billing (preview) — replaced by real Buy Plan flow below, kept for reference
          <section id="sec-billing" className="card p-6">
            <div className="flex items-center gap-2 mb-4"><h3 className="font-bold text-charcoal">{t.billingHead}</h3><PreviewTag label={t.preview} /></div>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="font-bold text-charcoal">{t.currentPlan}: {t.explorer}</p>
                <p className="text-2xl font-extrabold text-primary mt-1">{t.free}<span className="text-xs font-medium text-charcoal/40 ms-1">{t.always}</span></p>
              </div>
              <button disabled className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--line-strong)] text-charcoal/40 text-sm font-medium cursor-not-allowed">{t.upgradeSoon}</button>
            </div>
            <div className="mt-4 pt-4 border-t border-[var(--line)]">
              <p className="text-xs text-charcoal/45 mb-2">{t.paymentLabel}</p>
              <div className="flex flex-wrap gap-2">{PAYMENTS.map(p => <span key={p} className="chip !text-[11px] !py-0.5">{p}</span>)}</div>
            </div>
          </section>
          */}

          <section id="sec-billing" className="card p-6">
            <div className="flex items-center gap-2 mb-4"><h3 className="font-bold text-charcoal">{t.billingHead}</h3></div>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="font-bold text-charcoal">
                  {t.currentPlan}: {plan?.tier === 'launchpad' ? 'Launchpad' : plan?.tier === 'pathfinder' ? 'Pathfinder' : t.explorer}
                </p>
                <p className="text-2xl font-extrabold text-primary mt-1">
                  {plan?.tier === 'launchpad' && plan.subscription_current_period_end
                    ? <span className="text-sm font-medium text-charcoal/60">Renews {new Date(plan.subscription_current_period_end).toLocaleDateString()}</span>
                    : plan?.tier === 'pathfinder'
                      ? <span className="text-sm font-medium text-charcoal/60">Unlocked for life</span>
                      : <>{t.free}<span className="text-xs font-medium text-charcoal/40 ms-1">{t.always}</span></>}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {plan?.tier === 'free' && (
                  <button onClick={() => handleBuyPlan('pathfinder')} disabled={buying}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary text-primary text-sm font-medium disabled:opacity-50">
                    {buying ? '…' : 'Unlock Full Report — 149 SAR'}
                  </button>
                )}
                {plan?.tier !== 'launchpad' && (
                  <button onClick={() => handleBuyPlan('launchpad_monthly')} disabled={buying}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-50">
                    {buying ? '…' : 'Subscribe to Launchpad — 99 SAR/mo'}
                  </button>
                )}
              </div>
            </div>
            {transactions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[var(--line)]">
                <p className="text-xs text-charcoal/45 mb-2">Payment history</p>
                <div className="space-y-1">
                  {transactions.map(txn => (
                    <div key={txn.order_ref} className="flex justify-between text-xs text-charcoal/70">
                      <span>{txn.plan_code} · {txn.status}</span>
                      <span>{txn.amount} {txn.currency} · {new Date(txn.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* notifications (preview) */}
          <section id="sec-notifications" className="card p-6 scroll-mt-4">
            <div className="flex items-center gap-2"><h3 className="font-bold text-charcoal">{t.notifHead}</h3><PreviewTag label={t.preview} /></div>
            <p className="text-xs text-charcoal/45 mb-4">{t.notifSub}</p>
            <div className="divide-y divide-[var(--line)]">
              {NOTIF.map((n, i) => (
                <div key={n.id} className="flex items-center justify-between py-3">
                  <span className="text-sm text-charcoal/80">{n[locale === 'ar' ? 'ar' : 'en']}</span>
                  <Toggle on={notifs[i]} onClick={() => setNotifs(p => p.map((v, j) => j === i ? !v : v))} />
                </div>
              ))}
            </div>
          </section>

          {/* account */}
          <section id="sec-account" className="card p-6 scroll-mt-4">
            <h3 className="font-bold text-charcoal mb-4">{t.accountHead}</h3>
            <div className="divide-y divide-[var(--line)]">
              {[[t.fName, fullName], [t.fEmail, user?.email]].map(([lbl, val]) => (
                <div key={lbl} className="flex items-center justify-between py-3 gap-4">
                  <span className="text-sm text-charcoal/50">{lbl}</span>
                  <span className="text-sm font-medium text-charcoal truncate" dir={lbl === t.fEmail ? 'ltr' : undefined}>{val || '—'}</span>
                </div>
              ))}
              {latest?.country && (
                <div className="flex items-center justify-between py-3 gap-4"><span className="text-sm text-charcoal/50">{t.fCountry}</span><span className="text-sm font-medium text-charcoal capitalize">{latest.country}</span></div>
              )}
              <div className="flex items-center justify-between py-3 gap-4">
                <span className="text-sm text-charcoal/50">{t.fLang}</span>
                <div className="inline-flex rounded-lg border border-[var(--line-strong)] overflow-hidden text-xs font-medium">
                  {(['en', 'ar'] as const).map(l => (
                    <button key={l} onClick={() => router.replace(pathname, { locale: l })} className={`px-3 py-1.5 ${locale === l ? 'bg-primary text-white' : 'text-charcoal/60 hover:bg-lightblue'}`}>{l === 'en' ? 'EN' : 'عربي'}</button>
                  ))}
                </div>
              </div>
            </div>
            <Link href="/assessment" className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-primary hover:underline">
              {t.retake}<span>{dir === 'rtl' ? '←' : '→'}</span>
            </Link>
          </section>

          {/* contact */}
          <section className="card p-6">
            <h3 className="font-bold text-charcoal">{t.contactHead}</h3>
            <p className="text-xs text-charcoal/45 mb-3">{t.contactSub}</p>
            <div className="flex flex-wrap gap-3">
              <a href="tel:+97335082446" dir="ltr" className="chip">+973 3508 2446</a>
              <a href="mailto:projects@etijahcoaching.com" dir="ltr" className="chip">projects@etijahcoaching.com</a>
            </div>
          </section>
        </main>
      </div>

      {/* mobile bottom tabs */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-[var(--line)] flex px-1">
        <NavList variant="tab" active={active} lang={lang} onNav={go} />
      </nav>
    </div>
  )
}
