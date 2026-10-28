'use client'

// AssessmentGate: the "create an account and pay to continue" step shown inside the assessment, right after the
// Interests & Personality chapter. Step 1 is a free account (skipped when already signed in), step 2 saves the answers so
// far to that account and asks for payment. Once the account has paid access (bought, company seat, admin) it calls
// onUnlocked and the assessment carries on with the Values chapter. `confirming` is the same screen after coming back from
// the payment page: it waits for the payment to be confirmed instead of asking again.

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  apiAuthGet, apiAuthPost, startCheckout, previewDiscount, getParentLinkEligibility, createParentLink,
  type DiscountPreview, type PlanCode,
} from '@/lib/api'
import { track, trackOnce } from '@/lib/analytics'
import { formatPrice } from '@/lib/pricing'
import { useDisplayCurrency } from '@/lib/useDisplayCurrency'
import { buildReveal } from '@/data/revealScoring'
import Logomark from '@/components/brand/Logomark'

type GateStatus = {
  has_access: boolean
  org_granted: boolean
  org_status: string | null
  response_id: string | null
  answers: Record<string, unknown> | null
  slots_left: number | null
  latest_completed_id: string | null
}

type GatePlan = Extract<PlanCode, 'pathfinder' | 'launchpad_monthly'>

const STR = {
  en: {
    checking: 'One moment…',
    accountHead: 'Save your progress',
    accountBody: 'Create a free account so your answers are kept safe. Next you unlock the rest of the assessment and your full report.',
    signupTab: 'Create account', loginTab: 'Sign in',
    name: 'Full name', email: 'Email', password: 'Password (8+ characters)',
    createBtn: 'Create account and continue', loginBtn: 'Sign in and continue',
    existing: 'This email may already have an account. Try signing in.',
    payHead: 'Unlock the rest of your assessment',
    payBody: 'Your first chapter is saved. Pay once to finish the assessment and get your full report.',
    teaser: 'Your first result',
    included: 'What you unlock',
    bullets: ['Your values, strengths and work style', 'Your ranked career matches', 'Your full personal report (PDF)'],
    pathfinder: 'Pathfinder', pathfinderLine: 'Full report, yours for life',
    launchpad: 'Launchpad', launchpadLine: 'Full report + a 1:1 coaching session',
    code: 'Discount code', apply: 'Apply', codeOk: 'Code applied',
    codeErrors: {
      discount_invalid: "This code isn't valid.", discount_expired: 'This code has expired.', discount_not_started: "This code isn't active yet.",
      discount_used_up: 'This code has reached its limit.', discount_already_used: "You've already used this code.",
      discount_wrong_plan: "This code doesn't apply to this plan.", discount_rate_limited: 'Too many attempts. Please try again later.',
      discount_unavailable: 'Codes are unavailable right now. Please try again.',
    } as Record<string, string>,
    agree: 'I agree to the', terms: 'terms', and: 'and', privacy: 'privacy policy',
    payBtn: 'Continue to payment',
    parentBtn: 'Ask a parent to pay', parentDone: 'Link ready. Send it to your parent. This page continues by itself once they pay.',
    confirming: 'Confirming your payment…',
    slow: 'This is taking longer than usual. If you have paid, press the button to check again.',
    checkAgain: 'Check again',
    orgUnverified: 'Your company gives you free access. Please confirm your email first, then come back to this page.',
    retake: 'Your account already holds its full report, so a new assessment is not included.',
    failedNote: "The payment didn't go through, and you haven't been charged. You can try again.",
    existingHead: 'You already have a result',
    existingBody: 'Your account already has a finished assessment. Open it to unlock your full report. No need to answer the questions again.',
    existingBtn: 'Open my result',
    error: 'Something went wrong. Please try again.',
  },
  ar: {
    checking: 'لحظة…',
    accountHead: 'احفظ تقدّمك',
    accountBody: 'أنشئ حساباً مجانياً لنحفظ إجاباتك. بعدها تفتح بقية التقييم وتقريرك الكامل.',
    signupTab: 'إنشاء حساب', loginTab: 'تسجيل الدخول',
    name: 'الاسم الكامل', email: 'البريد الإلكتروني', password: 'كلمة المرور (8 أحرف أو أكثر)',
    createBtn: 'أنشئ الحساب وتابع', loginBtn: 'سجّل الدخول وتابع',
    existing: 'ربما يوجد حساب بهذا البريد. جرّب تسجيل الدخول.',
    payHead: 'افتح بقية تقييمك',
    payBody: 'تم حفظ فصلك الأول. ادفع مرة واحدة لتكمل التقييم وتحصل على تقريرك الكامل.',
    teaser: 'نتيجتك الأولى',
    included: 'ما ستفتحه',
    bullets: ['قيمك ونقاط قوتك وأسلوب عملك', 'مسارات مهنية مرتبة حسب توافقها معك', 'تقريرك الشخصي الكامل (PDF)'],
    pathfinder: 'مرشد المسار', pathfinderLine: 'التقرير الكامل، لك مدى الحياة',
    launchpad: 'منصة الانطلاق', launchpadLine: 'التقرير الكامل + جلسة تدريب فردية',
    code: 'كود الخصم', apply: 'تطبيق', codeOk: 'تم تطبيق الكود',
    codeErrors: {
      discount_invalid: 'هذا الكود غير صالح.', discount_expired: 'انتهت صلاحية هذا الكود.', discount_not_started: 'هذا الكود غير مفعّل بعد.',
      discount_used_up: 'تم استنفاد عدد مرات استخدام هذا الكود.', discount_already_used: 'لقد استخدمت هذا الكود من قبل.',
      discount_wrong_plan: 'هذا الكود لا ينطبق على هذه الباقة.', discount_rate_limited: 'محاولات كثيرة. حاول لاحقاً.',
      discount_unavailable: 'الأكواد غير متاحة حالياً. حاول مرة أخرى.',
    } as Record<string, string>,
    agree: 'أوافق على', terms: 'الشروط والأحكام', and: 'و', privacy: 'سياسة الخصوصية',
    payBtn: 'المتابعة إلى الدفع',
    parentBtn: 'اطلب من والدك الدفع', parentDone: 'الرابط جاهز. أرسله إلى والدك. تستمر هذه الصفحة تلقائياً بعد أن يدفع.',
    confirming: 'نتأكد من عملية الدفع…',
    slow: 'استغرق الأمر وقتاً أطول من المعتاد. إذا كنت قد دفعت، اضغط الزر للتحقق مرة أخرى.',
    checkAgain: 'تحقق مرة أخرى',
    orgUnverified: 'شركتك تمنحك وصولاً مجانياً. يرجى تأكيد بريدك الإلكتروني أولاً ثم العودة إلى هذه الصفحة.',
    retake: 'حسابك يحتوي بالفعل على تقريره الكامل، لذا لا يشمل تقييماً جديداً.',
    failedNote: 'لم تتم عملية الدفع ولم يتم خصم أي مبلغ. يمكنك المحاولة مرة أخرى.',
    existingHead: 'لديك نتيجة بالفعل',
    existingBody: 'حسابك يحتوي على تقييم مكتمل. افتحه لتفتح تقريرك الكامل، ولا حاجة لإعادة الإجابة عن الأسئلة.',
    existingBtn: 'افتح نتيجتي',
    error: 'حدث خطأ ما. حاول مرة أخرى.',
  },
} as const

const POLL_MS = 3000
const POLL_MAX = 20   // about a minute, then offer a manual "check again"

export default function AssessmentGate({ locale, answers, confirming = false, paymentFailed = false, onUnlocked }: {
  locale: string
  answers: Record<string, unknown>
  confirming?: boolean   // back from the payment page: wait for the payment to be confirmed
  paymentFailed?: boolean   // back from the payment page and it did not go through
  onUnlocked: (serverAnswers: Record<string, unknown> | null) => void
}) {
  const s = STR[locale === 'ar' ? 'ar' : 'en']
  const dir = locale === 'ar' ? 'rtl' : 'ltr'
  const currency = useDisplayCurrency()

  const [step, setStep] = useState<'checking' | 'account' | 'pay' | 'existing'>('checking')
  const [mode, setMode] = useState<'signup' | 'login'>(confirming ? 'login' : 'signup')   // someone who already paid has an account
  const [existingId, setExistingId] = useState<string | null>(null)
  const [name, setName] = useState(String(answers.QD1 ?? ''))
  const [email, setEmail] = useState(String(answers.QD2 ?? ''))
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [orgUnverified, setOrgUnverified] = useState(false)

  const [plan, setPlan] = useState<GatePlan>('pathfinder')
  const [codeInput, setCodeInput] = useState('')
  const [applied, setApplied] = useState<{ code: string; preview: DiscountPreview } | null>(null)
  const [codeError, setCodeError] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [canAskParent, setCanAskParent] = useState(false)
  const [parentLink, setParentLink] = useState('')
  const [slow, setSlow] = useState(false)

  // Latest props kept in refs so the polling below is not restarted every time the form re-renders.
  const unlockedRef = useRef(false)
  const answersRef = useRef(answers)
  const onUnlockedRef = useRef(onUnlocked)
  useEffect(() => { answersRef.current = answers; onUnlockedRef.current = onUnlocked })

  const unlock = useCallback((serverAnswers: Record<string, unknown> | null) => {
    if (unlockedRef.current) return
    unlockedRef.current = true
    track('assessment_gate_unlocked', { lang: locale })
    onUnlockedRef.current(serverAnswers)
  }, [locale])

  // Is the account allowed to go on? Unlocks and returns the status when it is, otherwise returns null.
  const checkAccess = useCallback(async (): Promise<GateStatus | null> => {
    const status = await apiAuthGet<GateStatus>('/assessment/gate')
    setOrgUnverified(status.org_status === 'unverified')
    if (status.has_access) { unlock(status.answers); return null }
    return status
  }, [unlock])

  // Saves the answers so far to the account (checkout needs a saved assessment), then asks whether it may go on.
  const afterSignedIn = useCallback(async () => {
    setError('')
    const a = answersRef.current
    try {
      // Ask first: someone who can already go on (paid, company seat, admin) needs nothing saved here.
      const status = await checkAccess()
      if (unlockedRef.current) return
      // A finished result already on the account is unlocked by paying for it: point there rather than selling a second one.
      if (!confirming && status?.latest_completed_id) {
        setExistingId(status.latest_completed_id)
        setStep('existing')
        return
      }
      // Coming back from the payment page the answers may not be loaded yet: never overwrite the saved copy with nothing.
      if (!confirming && Object.keys(a).length > 0) {
        await apiAuthPost('/assessment/partial', {
          full_name: a.QD1 ?? null,
          email: String(a.QD2 ?? email).trim(),
          country: a.QO1 ?? null,
          nationality: a.QO2 ?? null,
          age: Number.isFinite(Number(a.QO3)) && Number(a.QO3) >= 10 ? Number(a.QO3) : null,
          current_stage: a.QO4 ?? null,
          answers: a,
          locale,
        })
      }
      setStep('pay')
      trackOnce(`assessment_gate_viewed:${confirming ? 'back' : 'first'}`, 'assessment_gate_viewed', { lang: locale })
    } catch (e: unknown) {
      setError(e instanceof Error && e.message === 'retake_not_included' ? s.retake : s.error)
      if (!unlockedRef.current) setStep('pay')
    }
  }, [confirming, checkAccess, email, locale, s])

  // On open: already signed in -> straight to saving and checking; otherwise ask for an account first.
  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      if (session) afterSignedIn()
      else setStep('account')
    }).catch(() => { if (!cancelled) setStep('account') })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on open
  }, [])

  // Can this account get a payment link for a parent to pay (under-18 buyers)?
  useEffect(() => {
    if (step !== 'pay') return
    getParentLinkEligibility().then(r => setCanAskParent(r.eligible)).catch(() => {})
  }, [step])

  // While waiting for a payment (coming back from the shop, or a parent paying), check every few seconds.
  useEffect(() => {
    if (step !== 'pay' || !(confirming || parentLink)) return
    let tries = 0
    const id = window.setInterval(async () => {
      tries += 1
      try { await checkAccess(); if (unlockedRef.current) window.clearInterval(id) } catch { /* try again on the next tick */ }
      if (tries >= POLL_MAX) { window.clearInterval(id); setSlow(true) }
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [step, confirming, parentLink, checkAccess])

  async function submitAccount(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { full_name: name.trim() }, emailRedirectTo: `https://myetijahi.com/${locale}/assessment` },
        })
        if (err) { setError(err.message); return }
        // No session back means the address already has an account: send them to sign in instead.
        if (!data.session) { setError(s.existing); setMode('login'); return }
        track('assessment_account_created', { lang: locale })
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (err) { setError(err.message); return }
        await apiAuthPost('/assessment/link-by-email', {}).catch(() => {})
      }
      await afterSignedIn()
    } catch {
      setError(s.error)
    } finally {
      setBusy(false)
    }
  }

  function choosePlan(p: GatePlan) {
    setPlan(p); setApplied(null); setCodeError('')
  }

  async function applyCode() {
    if (!codeInput.trim()) return
    setBusy(true); setCodeError('')
    try {
      const code = codeInput.trim().toUpperCase()
      setApplied({ code, preview: await previewDiscount(plan, code) })
    } catch (e: unknown) {
      setApplied(null)
      setCodeError(s.codeErrors[e instanceof Error ? e.message : ''] ?? s.codeErrors.discount_invalid)
    } finally { setBusy(false) }
  }

  async function pay() {
    if (!agreed || busy) return
    setBusy(true); setError('')
    track('report_checkout_click', { plan_code: plan, discount_code: applied?.code ?? undefined, from: 'assessment_gate' })
    try {
      const { checkout_url } = await startCheckout(plan, applied?.code, 'assessment')
      window.location.href = checkout_url
    } catch (e: unknown) {
      setBusy(false)
      setError(e instanceof Error && s.codeErrors[e.message] ? s.codeErrors[e.message] : s.error)
    }
  }

  async function askParent() {
    setBusy(true); setError('')
    try {
      const { url } = await createParentLink(plan)
      setParentLink(url)
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try { await navigator.share({ url, title: 'Etijahi' }) } catch { /* cancelled: the link is still shown below */ }
      } else {
        try { await navigator.clipboard.writeText(url) } catch { /* shown below to copy by hand */ }
      }
    } catch { setError(s.error) }
    finally { setBusy(false) }
  }

  async function checkAgain() {
    setSlow(false)
    try { await checkAccess(); if (!unlockedRef.current) setSlow(true) } catch { setSlow(true) }
  }

  const reveal = buildReveal(answers, 'riasec', locale)
  const price = (key: 'pathfinder' | 'launchpad') => formatPrice(key, currency, locale)
  const inputCls = 'w-full rounded-xl border border-[var(--line-strong)] px-3 py-2.5 text-sm text-charcoal bg-white'

  return (
    <div className="fixed inset-0 z-50 brand-surface overflow-y-auto" dir={dir} lang={locale}>
      <div className="min-h-full flex items-center justify-center px-4 py-8">
        <div className="card p-6 w-full max-w-md">
          <div className="mb-5 flex items-center gap-3">
            <Logomark size={34} />
            <p className="text-xs text-charcoal/40">Etijahi · إتجاهي</p>
          </div>

          {step === 'checking' && <p className="text-sm text-charcoal/60">{s.checking}</p>}

          {step === 'account' && (
            <form onSubmit={submitAccount} className="space-y-4">
              <div>
                <h2 className="text-xl font-extrabold text-charcoal">{s.accountHead}</h2>
                <p className="mt-1 text-sm text-charcoal/60">{s.accountBody}</p>
              </div>
              <div className="flex gap-2 text-sm">
                {(['signup', 'login'] as const).map(m => (
                  <button key={m} type="button" onClick={() => { setMode(m); setError('') }}
                    className={`px-3 py-1.5 rounded-lg border ${mode === m ? 'bg-primary text-white border-primary' : 'border-[var(--line-strong)] text-charcoal/70'}`}>
                    {m === 'signup' ? s.signupTab : s.loginTab}
                  </button>
                ))}
              </div>
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-charcoal/70 mb-1">{s.name}</label>
                  <input className={inputCls} value={name} onChange={e => setName(e.target.value)} required autoComplete="name" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-charcoal/70 mb-1">{s.email}</label>
                <input type="email" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal/70 mb-1">{s.password}</label>
                <input type="password" className={inputCls} value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} dir="ltr" />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={busy} data-track="assessment_gate_account"
                className="w-full px-4 py-3 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50">
                {busy ? '…' : mode === 'signup' ? s.createBtn : s.loginBtn}
              </button>
            </form>
          )}

          {step === 'existing' && (
            <div className="space-y-4">
              <h2 className="text-xl font-extrabold text-charcoal">{s.existingHead}</h2>
              <p className="text-sm text-charcoal/60">{s.existingBody}</p>
              <button onClick={() => { window.location.href = `/${locale}/results/${existingId}` }} data-track="assessment_gate_existing"
                className="w-full px-4 py-3 rounded-xl bg-primary text-white text-sm font-semibold">{s.existingBtn}</button>
            </div>
          )}

          {step === 'pay' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-extrabold text-charcoal">{s.payHead}</h2>
                <p className="mt-1 text-sm text-charcoal/60">{s.payBody}</p>
              </div>

              {orgUnverified && <p className="text-sm rounded-xl bg-amber-50 text-amber-800 px-3 py-2">{s.orgUnverified}</p>}
              {paymentFailed && <p className="text-sm rounded-xl bg-amber-50 text-amber-800 px-3 py-2">{s.failedNote}</p>}

              <div className="rounded-xl bg-[var(--surface-2,#f5f7f8)] px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">{s.teaser}</p>
                <p className="mt-1 text-sm font-bold text-charcoal">{reveal.head}</p>
                <p className="text-sm text-charcoal/70">{reveal.body}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">{s.included}</p>
                <ul className="mt-1 space-y-1 text-sm text-charcoal/80">
                  {s.bullets.map(b => <li key={b}>✓ {b}</li>)}
                </ul>
              </div>

              {confirming ? (
                <div className="text-sm text-charcoal/70">
                  <p>{s.confirming}</p>
                  {error && <p className="mt-2 text-red-600">{error}</p>}
                  {slow && (
                    <div className="mt-3 space-y-2">
                      <p>{s.slow}</p>
                      <button onClick={checkAgain} className="px-4 py-2 rounded-xl border border-[var(--line-strong)] text-sm font-medium">{s.checkAgain}</button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid gap-2">
                    {([['pathfinder', s.pathfinder, s.pathfinderLine, 'pathfinder'], ['launchpad_monthly', s.launchpad, s.launchpadLine, 'launchpad']] as const).map(([code, label, line, key]) => (
                      <button key={code} type="button" onClick={() => choosePlan(code)}
                        className={`text-start rounded-xl border px-3 py-2.5 ${plan === code ? 'border-primary ring-1 ring-primary' : 'border-[var(--line-strong)]'}`}>
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-charcoal">{label}</span>
                          <span className="text-sm font-semibold text-charcoal">
                            {plan === code && applied ? `${applied.preview.final} ${applied.preview.currency}` : price(key)}
                          </span>
                        </span>
                        <span className="block text-xs text-charcoal/60">{line}</span>
                      </button>
                    ))}
                  </div>

                  <div>
                    <div className="flex gap-2">
                      <input className={inputCls} placeholder={s.code} value={codeInput} onChange={e => setCodeInput(e.target.value)} dir="ltr" />
                      <button type="button" onClick={applyCode} disabled={busy || !codeInput.trim()}
                        className="px-3 rounded-xl border border-[var(--line-strong)] text-sm font-medium disabled:opacity-40">{s.apply}</button>
                    </div>
                    {applied && <p className="mt-1 text-xs text-green-700">{s.codeOk}</p>}
                    {codeError && <p className="mt-1 text-xs text-red-600">{codeError}</p>}
                  </div>

                  <label className="flex items-start gap-2 text-xs text-charcoal/70">
                    <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 shrink-0" />
                    <span>
                      {s.agree}{' '}
                      <a href="https://shop.etijahcoaching.com/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">{s.terms}</a>
                      {' '}{s.and}{' '}
                      <a href="https://shop.etijahcoaching.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">{s.privacy}</a>.
                    </span>
                  </label>

                  {error && <p className="text-sm text-red-600">{error}</p>}

                  <button onClick={pay} disabled={!agreed || busy} data-track="assessment_gate_pay"
                    className="w-full px-4 py-3 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-40">
                    {busy ? '…' : s.payBtn}
                  </button>

                  {canAskParent && (
                    <div className="text-center">
                      {parentLink ? (
                        <div className="text-xs text-charcoal/70 space-y-1">
                          <p>{s.parentDone}</p>
                          <p className="break-all" dir="ltr">{parentLink}</p>
                        </div>
                      ) : (
                        <button onClick={askParent} disabled={busy} className="text-sm text-primary underline disabled:opacity-50">{s.parentBtn}</button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
