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
import { apiAuthGet, apiAuthGetBlob, apiAuthPost, apiAuthPatch, apiAuthDelete, startCheckout, type PlanCode } from '@/lib/api'
import { trackOnce } from '@/lib/analytics'
import { formatPrice } from '@/lib/pricing'
import { useDisplayCurrency } from '@/lib/useDisplayCurrency'
import Logomark from '@/components/brand/Logomark'
import CoachingBooker from '@/components/dashboard/CoachingBooker'
import { LockedSection } from '@/components/shared/LockedSection'

type Application = {
  id: string; job_title: string; company: string | null; location: string | null
  source: string | null; url: string | null; matched_career: string | null
  status: 'saved' | 'applied' | 'interview' | 'offer' | 'rejected'; created_at: string
}
type AssessmentSummary = {
  id: string; full_name: string; country: string; completed: boolean; created_at: string; top_type: string | null
  locale?: 'en' | 'ar' | null
}
type Plan = {
  tier: 'free' | 'pathfinder' | 'launchpad'
  pathfinder_unlocked: boolean
  pathfinder_unlocked_at: string | null
  subscription_plan_code: string | null
  subscription_status: string | null
  subscription_current_period_end: string | null
  booking_url?: string | null
}
// Hub transaction statuses that mean money was received — confirm against the values the shop actually sends.
const PAID_STATUSES = ['paid', 'captured', 'succeeded', 'success', 'completed']

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

// Product scope, 4 Oct 2026: Pathfinder = the full report; Launchpad = a 1:1 coaching session. Job matching, the saved-jobs
// tracker and the notification preferences are switched off here (not deleted). Set a flag to true to bring one back.
// See Documents/Removed_Features_4Oct2026.md.
const SHOW_JOB_MATCHES = false
const SHOW_NOTIFICATIONS = false

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
    reportReadySub: 'Career matches · AI impact · plan · courses · certifications',
    reportReadyHeadFree: 'Your report is ready', reportReadySubFree: 'Your top career matches and your profile',
    fullBuildingHead: 'We’re building your full report',
    fullBuildingSub: 'Thank you for your purchase. This usually takes a few minutes. You can leave this page; we’ll email you when it’s ready.',
    fullReadyHead: 'Your full report is ready',
    fullReadySub: 'Your plan, courses, certifications and the AI-impact analysis are now unlocked.',
    viewReport: 'View report', download: 'Download PDF', downloading: 'Downloading…',
    downloadAr: 'Download Arabic PDF', downloadEn: 'Download English PDF',
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
    reportReadySub: 'مسارات مهنية · أثر الذكاء الاصطناعي · خطة · دورات · شهادات',
    reportReadyHeadFree: 'تقريرك جاهز', reportReadySubFree: 'أفضل مساراتك المهنية وملفّك الشخصي',
    fullBuildingHead: 'نجهّز تقريرك الكامل',
    fullBuildingSub: 'شكراً لشرائك. يستغرق ذلك عادةً بضع دقائق. يمكنك مغادرة هذه الصفحة وسنرسل لك رسالة بريد عند اكتماله.',
    fullReadyHead: 'تقريرك الكامل جاهز',
    fullReadySub: 'خطتك والدورات والشهادات وتحليل أثر الذكاء الاصطناعي أصبحت متاحة الآن.',
    viewReport: 'عرض التقرير', download: 'تحميل PDF', downloading: 'جاري التحميل…',
    downloadAr: 'تحميل النسخة العربية PDF', downloadEn: 'تحميل النسخة الإنجليزية PDF',
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

// Billing / coaching / contact wording (kept apart from T so the plan names and prices read in the page language).
const B = {
  en: {
    plan: { launchpad: 'Launchpad', pathfinder: 'Pathfinder' },
    launchpadLine: 'Full report + a 1:1 coaching session', lifetimeLine: 'Unlocked for life',
    takeAssessment: 'Take the assessment to unlock your full report',
    unlockFull: 'Unlock Full Report', downloadLocked: 'Download PDF (Pathfinder)', getLaunchpad: 'Get Launchpad (adds a 1:1 coaching session)',
    coachHead: 'Your 1:1 coaching session', coachPick: 'Pick a time that suits you. We have also been notified of your purchase.',
    coachBook: 'Book your session', coachHelp: 'Need help? Contact us:',
    // coachContact: 'To book your session, contact us and we will find a time that suits you. We have also been notified of your purchase.',
    coachContact: 'To book your session, message us on WhatsApp or email and we will find a time that suits you. We have also been notified of your purchase.',
    history: 'Payment history', typeWord: 'type',
    agreeHead: 'Before you pay', agreeTax: 'The price you see includes tax.', agreeText: 'I have read and agree to the', agreeTerms: 'Terms and Conditions', agreeAnd: 'and the', agreePrivacy: 'Privacy Policy', agreeContinue: 'Continue to payment', agreeCancel: 'Cancel',
  },
  ar: {
    plan: { launchpad: 'منصة الانطلاق', pathfinder: 'مرشد المسار' },
    launchpadLine: 'التقرير الكامل + جلسة تدريب فردية', lifetimeLine: 'مفتوح مدى الحياة',
    takeAssessment: 'أجرِ التقييم لفتح تقريرك الكامل',
    unlockFull: 'افتح التقرير الكامل', downloadLocked: 'تحميل PDF (مرشد المسار)', getLaunchpad: 'احصل على منصة الانطلاق (تضيف جلسة تدريب فردية)',
    coachHead: 'جلستك التدريبية الفردية', coachPick: 'اختر الوقت الذي يناسبك. وقد وصلنا إشعار بعملية الشراء.',
    coachBook: 'احجز جلستك', coachHelp: 'تحتاج مساعدة؟ تواصل معنا:',
    // coachContact: 'لحجز جلستك، تواصل معنا وسنحدد وقتاً يناسبك. وقد وصلنا إشعار بعملية الشراء.',
    coachContact: 'لحجز جلستك، راسلنا عبر واتساب أو البريد الإلكتروني وسنحدد وقتاً يناسبك. وقد وصلنا إشعار بعملية الشراء.',
    history: 'سجل المدفوعات', typeWord: '',
    agreeHead: 'قبل الدفع', agreeTax: 'السعر المعروض شامل الضريبة.', agreeText: 'لقد قرأت وأوافق على', agreeTerms: 'الشروط والأحكام', agreeAnd: 'و', agreePrivacy: 'سياسة الخصوصية', agreeContinue: 'المتابعة إلى الدفع', agreeCancel: 'إلغاء',
  },
} as const
const RIASEC_AR: Record<string, string> = { realistic: 'الباني', investigative: 'المحلل', artistic: 'المبدع', social: 'المُعين', enterprising: 'القائد', conventional: 'المنظّم' }
const CONTACT_EMAIL = 'info@myetijahi.com'

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
  const [assessmentsLoading, setAssessmentsLoading] = useState(true)
  const [applications, setApplications] = useState<Application[]>([])
  const [applicationsLoading, setApplicationsLoading] = useState(true)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [planLoading, setPlanLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([])
  const [jobMatchesLoading, setJobMatchesLoading] = useState(true)
  const [buying, setBuying] = useState(false)
  // Display-only currency from the proxy's geo cookie (checkout is charged in SAR); read after mount.
  const displayCurrency = useDisplayCurrency()
  const [topMatch, setTopMatch] = useState<string | null>(null)
  const [notifs, setNotifs] = useState(NOTIF.map(n => n.on))
  const [active, setActive] = useState('home')
  const [error, setError] = useState('')
  const [downloadingReport, setDownloadingReport] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const [justVerified, setJustVerified] = useState(false)
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navRouter.push(`/${locale}/login`); return }
      setUser(session.user); setLoading(false)
    })
  }, [navRouter, locale])

  // Tag Manager: the payment webhook is server-side, so the browser's only proof
  // of a confirmed purchase is a paid row in the user's transaction list. Fired
  // once per order (localStorage), and only for an order confirmed in the last hour —
  // i.e. the purchase the buyer just came back from — so opening the dashboard on
  // another device (or after clearing storage) doesn't re-report old purchases.
  useEffect(() => {
    const RECENT_MS = 60 * 60 * 1000
    transactions
      .filter(txn => PAID_STATUSES.includes(txn.status.toLowerCase()) && Date.now() - new Date(txn.created_at).getTime() < RECENT_MS)
      .forEach(txn => trackOnce(`purchase:${txn.order_ref}`, 'report_purchase', { value: txn.amount, currency: txn.currency, transaction_id: txn.order_ref, event_id: txn.order_ref }, 'local'))
  }, [transactions])

  useEffect(() => {
    if (!user) return
    apiAuthGet<Application[]>('/applications').then(setApplications).catch(() => {}).finally(() => setApplicationsLoading(false))
    apiAuthGet<Plan>('/billing/plan').then(setPlan).catch(() => {}).finally(() => setPlanLoading(false))
    apiAuthGet<Transaction[]>('/billing/transaction').then(setTransactions).catch(() => {})
    apiAuthGet<JobMatch[]>('/jobs/my-matches').then(setJobMatches).catch(() => {}).finally(() => setJobMatchesLoading(false))
    // Link any prior anonymous assessment (matched by email) to this account
    // before checking what assessments the user has. login/page.tsx already
    // does this before navigating here, but that only covers the plain-login
    // path — landing here via a signup email-confirmation link (no explicit
    // "login" step happens) needs its own linking too, or that user's
    // pre-signup assessment never surfaces.
    apiAuthPost('/assessment/link-by-email', {}).catch(() => {}).finally(() => {
      apiAuthGet<AssessmentSummary[]>('/assessment/my-assessments')
        .then(list => {
          const sorted = [...list].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
          setAssessments(sorted)
          const latest = sorted[0]
          if (latest) {
            apiAuthGet<any>(`/assessment/${latest.id}/career-suggestions`)
              .then(d => setTopMatch(d.suggestions?.[0]?.title ?? null)).catch(() => {})
            // In Arabic, show the same career title the (Arabic) report uses, when that report exists.
            if (locale === 'ar') {
              apiAuthGet<any>(`/assessment/${latest.id}/career-recommendations?locale=ar`)
                .then(d => { const tt = d.career_recommendations?.[0]?.title; if (tt) setTopMatch(tt) }).catch(() => {})
            }
          }
        })
        .catch(() => {})
        .finally(() => setAssessmentsLoading(false))
    })
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
  async function downloadReport(id: string, reportLocale?: 'en' | 'ar') {
    setDownloadingReport(true)
    setDownloadError('')
    try {
      const query = reportLocale ? `?locale=${reportLocale}` : ''
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
      setDownloadError(e instanceof Error ? e.message : 'Failed to download report')
    } finally {
      setDownloadingReport(false)
    }
  }
  // Before the payment page the buyer must tick that they agree to the terms and privacy policy.
  const [confirmPlan, setConfirmPlan] = useState<PlanCode | null>(null)
  const [agreed, setAgreed] = useState(false)
  function handleBuyPlan(planCode: PlanCode) {
    // The paid report is built from an assessment — send people who have none to take it first.
    if (!assessments.length) { navRouter.push(`/${locale}/assessment`); return }
    setAgreed(false)
    setConfirmPlan(planCode)
  }
  async function proceedToPayment() {
    if (!confirmPlan || !agreed) return
    setBuying(true)
    try {
      const { checkout_url } = await startCheckout(confirmPlan)
      window.location.href = checkout_url
    } catch (e: unknown) {
      setBuying(false)
      setConfirmPlan(null)
      setError(e instanceof Error ? e.message : 'Could not start checkout')
    }
  }

  const searchParams = useSearchParams()
  useEffect(() => {
    if (!user) return
    if (searchParams.get('verified') === '1') {
      setJustVerified(true)
      navRouter.replace(`/${locale}/dashboard`)
      return
    }
    const buy = searchParams.get('buy')
    // launchpad_yearly no longer exists (Launchpad is a one-time purchase), so a stale link to it is dropped.
    if (buy === 'pathfinder' || buy === 'launchpad_monthly') {
      if (assessmentsLoading) return  // wait until we know whether they have an assessment
      navRouter.replace(`/${locale}/dashboard`)
      handleBuyPlan(buy)
    } else if (buy === 'launchpad_yearly') {
      navRouter.replace(`/${locale}/dashboard`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, assessmentsLoading])

  // The shop redirects the buyer back with ?order_ref=…&status=paid. That redirect is unsigned,
  // so it is only a cue to look — the signed webhook is what marks the order paid, and it can land
  // a moment after the redirect. Re-check the transaction list briefly until the order shows paid
  // (the effect above then fires report_purchase). status=failed never fires anything.
  useEffect(() => {
    if (!user) return
    const orderRef = searchParams.get('order_ref')
    if (!orderRef || searchParams.get('status') !== 'paid') return
    let tries = 0
    const id = window.setInterval(() => {
      tries += 1
      apiAuthGet<Transaction[]>('/billing/transaction')
        .then(rows => {
          setTransactions(rows)
          if (rows.some(t => t.order_ref === orderRef && PAID_STATUSES.includes(t.status.toLowerCase()))) window.clearInterval(id)
        })
        .catch(() => {})
      if (tries >= 10) window.clearInterval(id)
    }, 3000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- searchParams is read once on arrival
  }, [user])

  // After a purchase the full report is built in the background (see the payment webhook). While that runs, and for an hour
  // after paying, show a short notice with the state: building, then ready.
  const [fullReport, setFullReport] = useState<'idle' | 'building' | 'ready'>('idle')
  useEffect(() => {
    const target = assessments[0]
    if (!target || !plan || plan.tier === 'free') return
    const recentlyPaid = transactions.some(txn => PAID_STATUSES.includes(txn.status.toLowerCase()) && Date.now() - new Date(txn.created_at).getTime() < 60 * 60 * 1000)
    if (!recentlyPaid) return
    let stopped = false
    let tries = 0
    const check = async (): Promise<boolean> => {
      try {
        const r = await apiAuthGet<{ ready: boolean }>(`/assessment/${target.id}/full-report-status?locale=${target.locale === 'ar' ? 'ar' : 'en'}`)
        if (!stopped) setFullReport(r.ready ? 'ready' : 'building')
        return r.ready
      } catch { return false }
    }
    check()
    const id = window.setInterval(async () => {
      tries += 1
      if ((await check()) || tries >= 90) window.clearInterval(id)
    }, 10000)
    return () => { stopped = true; window.clearInterval(id) }
  }, [assessments, plan, transactions])

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

  const lang = locale === 'ar' ? 'ar' : 'en'
  const b = B[lang]
  const typeLabel = (v: string) => lang === 'ar' ? `نوع ${RIASEC_AR[v] || v}` : `${v} type`

  const stats = [
    { icon: 'check', label: t.statCompleted, value: completedDate ? dateFmt(completedDate) : '—' },
    { icon: 'target', label: t.statMatch, value: topMatch || (topType ? typeLabel(topType) : '—'), accent: true },
    { icon: 'refresh', label: t.statRetake, value: retakeDays != null ? (locale === 'ar' ? `بعد ${Math.max(0, retakeDays)} يوماً` : `in ${Math.max(0, retakeDays)} days`) : '—' },
  ]

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
          {/* <button onClick={handleLogout} title={t.signOut} className="ms-auto text-white/50 hover:text-white text-xs">✕</button> */}
          <button onClick={handleLogout} title={t.signOut} className="ms-auto shrink-0 rounded-full border border-white/30 px-3 py-1.5 text-xs font-semibold text-white/85 hover:bg-white/10 hover:text-white transition-colors">{t.signOut}</button>
        </div>
      </aside>

      {/* main */}
      <div className="md:ms-64">
        <main ref={mainRef} className="max-w-3xl mx-auto px-4 md:px-8 py-8 pb-28 md:pb-12 space-y-5">

          {justVerified && (
            <div className="rounded-xl bg-teal/10 border border-teal/30 text-teal px-4 py-3 text-sm flex items-center justify-between">
              <span>{locale === 'ar' ? 'تم تأكيد بريدك الإلكتروني بنجاح!' : 'Your email has been verified!'}</span>
              <button onClick={() => setJustVerified(false)} className="opacity-60 hover:opacity-100">✕</button>
            </div>
          )}

          {/* welcome */}
          <header id="sec-home" className="flex items-center justify-between gap-4 flex-wrap scroll-mt-4">
            <div>
              <h1 className="text-2xl font-extrabold text-charcoal">{t.welcome} {firstName}</h1>
              {topType && <span className="chip chip-teal capitalize mt-2">✦ {typeLabel(topType)}</span>}
            </div>
          </header>

          {/* The separate 'we are building your full report' notice was merged into the report card below (one box, no duplicate). */}

          {/* report status */}
          <section id="sec-report" className="card p-6 scroll-mt-4">
            {assessmentsLoading ? (
              <div className="animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-24 bg-lightblue rounded" />
                  <Logomark size={34} />
                </div>
                <div className="h-6 w-2/3 bg-lightblue rounded mt-3" />
                <div className="h-4 w-1/2 bg-lightblue rounded mt-3" />
                <div className="flex gap-3 mt-5">
                  <div className="h-10 w-36 bg-lightblue rounded-xl" />
                  <div className="h-10 w-32 bg-lightblue rounded-xl" />
                </div>
              </div>
            ) : latest ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="eyebrow">{t.reportReadyEyebrow}</span>
                  <Logomark size={34} />
                </div>
                <h2 className="text-xl font-extrabold text-charcoal mt-2 flex items-center gap-2">
                  {fullReport === 'building' && <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />}
                  {fullReport === 'building' ? t.fullBuildingHead : plan && plan.tier !== 'free' ? t.reportReadyHead : t.reportReadyHeadFree}
                </h2>
                <p className="text-sm text-charcoal/60 mt-1">{fullReport === 'building' ? t.fullBuildingSub : plan && plan.tier !== 'free' ? t.reportReadySub : t.reportReadySubFree}</p>
                <div className="flex flex-wrap gap-3 mt-5">
                  <Link href={`/results/${latest.id}`} className="cta" style={{ padding: '11px 18px', fontSize: 14, borderRadius: 12 }}>
                    <span>{t.viewReport}</span><span className="cta-arrow">{dir === 'rtl' ? '←' : '→'}</span>
                  </Link>
                  {planLoading ? null : plan && plan.tier !== 'free' ? (<>
                  <button data-track="dashboard_download_report" onClick={() => downloadReport(latest.id)} disabled={downloadingReport}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--line-strong)] text-charcoal/70 text-sm font-medium hover:bg-lightblue transition-colors disabled:opacity-50">
                    <Icon name="report" size={16} />{downloadingReport ? t.downloading : t.download}
                  </button>
                  {latest.locale !== 'ar' && <button
                    data-track="dashboard_download_report_alt_lang"
                    onClick={() => downloadReport(latest.id, 'ar')}
                    disabled={downloadingReport}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--line-strong)] text-charcoal/70 text-sm font-medium hover:bg-lightblue transition-colors disabled:opacity-50"
                  >
                    <Icon name="report" size={16} />
                    {downloadingReport ? t.downloading : t.downloadAr}
                  </button>}
                  </>) : (
                    <button data-track="dashboard_download_locked" onClick={() => handleBuyPlan('pathfinder')} disabled={buying}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--line-strong)] text-charcoal/70 text-sm font-medium hover:bg-lightblue transition-colors disabled:opacity-50">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>{b.downloadLocked}
                    </button>
                  )}
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

          {/* job matches: real for Launchpad, locked preview otherwise. Hidden: see SHOW_JOB_MATCHES */}
          {SHOW_JOB_MATCHES && (
          <section id="sec-jobs" className="space-y-4 scroll-mt-4">
            {planLoading ? (
              <div className="card p-5 animate-pulse">
                <div className="h-3 w-24 bg-lightblue rounded mb-3" />
                <div className="h-16 bg-lightblue rounded-xl" />
              </div>
            ) : plan?.tier === 'launchpad' ? (
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-1"><span className="eyebrow !text-primary">{t.jobsHead}</span></div>
                <p className="text-xs text-charcoal/45 mb-4">Refreshed daily from live GCC openings matched to your top careers.</p>
                {jobMatchesLoading ? (
                  <div className="h-16 bg-lightblue rounded-xl animate-pulse" />
                ) : jobMatches.length === 0 ? (
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
                <button disabled
                  className="cta cta-teal inline-flex mt-4 opacity-50 cursor-not-allowed" style={{ padding: '9px 16px', fontSize: 13, borderRadius: 999 }}>
                  Launchpad — Coming Soon
                </button>
              </div>
            )}

            <div className="card p-5">
              <h3 className="font-bold text-charcoal">{t.trackerHead}</h3>
              <p className="text-xs text-charcoal/45 mb-4">{t.trackerSub}</p>
              {error && <p className="text-rose-500 text-sm mb-3">{error}</p>}
              {applicationsLoading ? (
                <div className="h-16 bg-lightblue rounded-xl animate-pulse" />
              ) : applications.length === 0 ? (
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
                                <div className="relative flex-1">
                                  <select value={app.status} onChange={e => moveStage(app.id, e.target.value as Application['status'])}
                                    className="text-[11px] border border-[var(--line-strong)] rounded-md ps-1 pe-4 py-0.5 w-full bg-white appearance-none">
                                    {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                                  </select>
                                  <svg className="pointer-events-none absolute end-1 top-1/2 -translate-y-1/2 text-charcoal/40" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 9l6 6 6-6" />
                                  </svg>
                                </div>
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

            {/* "More on the way" cards (CV rebuild, WhatsApp, outreach, interview practice) hidden 4 Oct 2026: those features are no longer planned.
            <div>
              <h3 className="font-bold text-charcoal mb-3">{t.comingSoonHead}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <LockedSection tag={t.comingSoon} title={t.cvHead} body={t.cvBody} footer={t.notBuilt} />
                <LockedSection tag={t.comingSoon} title={t.whatsappHead} body={t.whatsappBody} footer={t.notBuilt} />
                <LockedSection tag={t.comingSoon} title={t.outreachHead} body={t.outreachBody} footer={t.notBuilt} />
                <LockedSection tag={t.comingSoon} title={t.interviewHead} body={t.interviewBody} footer={t.notBuilt} />
              </div>
            </div>
            */}
          </section>
          )}

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
            {planLoading ? (
              <div className="animate-pulse">
                <div className="h-4 w-32 bg-lightblue rounded" />
                <div className="h-7 w-24 bg-lightblue rounded mt-2" />
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-bold text-charcoal">
                    {t.currentPlan}: {plan?.tier === 'launchpad' ? b.plan.launchpad : plan?.tier === 'pathfinder' ? b.plan.pathfinder : t.explorer}
                  </p>
                  <p className="text-2xl font-extrabold text-primary mt-1">
                    {plan?.tier === 'launchpad'
                      ? <span className="text-sm font-medium text-charcoal/60">{b.launchpadLine}</span>
                      : plan?.tier === 'pathfinder'
                        ? <span className="text-sm font-medium text-charcoal/60">{b.lifetimeLine}</span>
                        : <>{t.free}<span className="text-xs font-medium text-charcoal/40 ms-1">{t.always}</span></>}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {plan?.tier === 'free' && !assessmentsLoading && !assessments.length && (
                    <Link href="/assessment" data-track="dashboard_take_assessment"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary text-primary text-sm font-medium">
                      {b.takeAssessment}
                    </Link>
                  )}
                  {plan?.tier === 'free' && assessments.length > 0 && (
                    <button data-track="dashboard_unlock_pathfinder" onClick={() => handleBuyPlan('pathfinder')} disabled={buying}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary text-primary text-sm font-medium disabled:opacity-50">
                      {buying ? '…' : `${b.unlockFull} — ${formatPrice('pathfinder', displayCurrency, lang)}`}
                    </button>
                  )}
                  {plan?.tier !== 'launchpad' && assessments.length > 0 && (
                    <button data-track="dashboard_unlock_launchpad" onClick={() => handleBuyPlan('launchpad_monthly')} disabled={buying}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-50">
                      {buying ? '…' : `${b.getLaunchpad} — ${formatPrice(plan?.tier === 'pathfinder' ? 'launchpad_upgrade' : 'launchpad', displayCurrency, lang)}`}
                    </button>
                  )}
                </div>
              </div>
            )}
            {plan?.tier === 'launchpad' && (
              <div className="mt-4 pt-4 border-t border-[var(--line)]">
                <p className="text-sm font-bold text-charcoal">{b.coachHead}</p>
                <p className="text-xs text-charcoal/55 mt-1">{b.coachPick}</p>
                <CoachingBooker lang={lang} />
                <p className="text-xs text-charcoal/45 mt-3">{b.coachHelp}</p>
                <div className="flex flex-wrap gap-3 mt-3">
                  {/* <a href="tel:+966550770711" dir="ltr" className="chip">+966 55 077 0711</a> */}
                  <a href="https://wa.me/966550770711" target="_blank" rel="noopener noreferrer" dir="ltr" className="chip">WhatsApp +966 55 077 0711</a>
                  <a href={`mailto:${CONTACT_EMAIL}`} dir="ltr" className="chip">{CONTACT_EMAIL}</a>
                </div>
              </div>
            )}
            {transactions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[var(--line)]">
                <p className="text-xs text-charcoal/45 mb-2">{b.history}</p>
                <div className="space-y-1">
                  {transactions.map(txn => (
                    <div key={txn.order_ref} className="flex justify-between text-xs text-charcoal/70">
                      <span>{txn.plan_code} · {txn.status}</span>
                      <span>{txn.amount} {txn.currency} · {new Date(txn.created_at).toLocaleDateString(lang === 'ar' ? 'ar' : 'en-GB')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* notifications (preview). Hidden: see SHOW_NOTIFICATIONS */}
          {SHOW_NOTIFICATIONS && (
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
          )}

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
              <a href="tel:+966550770711" dir="ltr" className="chip">+966 55 077 0711</a>
              <a href={`mailto:${CONTACT_EMAIL}`} dir="ltr" className="chip">{CONTACT_EMAIL}</a>
            </div>
          </section>
        </main>
      </div>

      {confirmPlan && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" role="dialog" aria-modal="true">
          <div className="card p-6 max-w-md w-full" dir={dir}>
            <h3 className="font-bold text-charcoal text-lg">{b.agreeHead}</h3>
            <p className="mt-1 text-sm text-charcoal/60">{b.agreeTax}</p>
            <label className="flex items-start gap-3 mt-4 cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-1 w-4 h-4 shrink-0" />
              <span className="text-sm text-charcoal/80 leading-relaxed">
                {b.agreeText}{' '}
                <a href="https://shop.etijahcoaching.com/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">{b.agreeTerms}</a>
                {' '}{b.agreeAnd}{' '}
                <a href="https://shop.etijahcoaching.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">{b.agreePrivacy}</a>.
              </span>
            </label>
            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setConfirmPlan(null)} disabled={buying}
                className="px-4 py-2.5 rounded-xl border border-[var(--line-strong)] text-charcoal/70 text-sm font-medium disabled:opacity-50">{b.agreeCancel}</button>
              <button data-track="dashboard_confirm_payment" onClick={proceedToPayment} disabled={!agreed || buying}
                className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-40">{buying ? '…' : b.agreeContinue}</button>
            </div>
          </div>
        </div>
      )}

      {/* mobile bottom tabs */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-[var(--line)] flex px-1">
        <NavList variant="tab" active={active} lang={lang} onNav={go} />
      </nav>
    </div>
  )
}
