'use client'

import { use, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { getFriendInvite } from '@/lib/api'
import { FRIEND_KEY, FRIEND_CONSENT_KEY } from '@/lib/friendInvite'
import { track } from '@/lib/analytics'

const T = {
  en: {
    head: (n: string | null) => `${n ?? 'A friend'} invited you to compare study matches`,
    body: 'Answer the free questions about your interests and personality (about 10 minutes). Then you both see one number: how well your interests match. Nobody sees anyone’s answers, only that number.',
    consent: 'I agree that my friend will see our match percentage and my first name.', consentNeeded: 'Please tick the box to start.',
    cta: 'Start', used: 'This invite has already been used.', expired: 'This invite has expired. Ask your friend for a new one.', invalid: 'This link is not valid.',
  },
  ar: {
    head: (n: string | null) => `${n ?? 'صديقك'} يدعوك لمقارنة التوافق في الدراسة`,
    body: 'أجب عن الأسئلة المجانية حول اهتماماتك وشخصيتك (نحو ١٠ دقائق). بعدها يظهر لكما رقم واحد: مدى توافق اهتماماتكما. لا يرى أحد إجابات الآخر، الرقم فقط.',
    consent: 'أوافق أن يرى صديقي نسبة التوافق بيننا واسمي الأول.', consentNeeded: 'يرجى تحديد المربع للبدء.',
    cta: 'ابدأ', used: 'هذه الدعوة استُخدمت من قبل.', expired: 'انتهت صلاحية هذه الدعوة. اطلب دعوة جديدة من صديقك.', invalid: 'هذا الرابط غير صالح.',
  },
}

export default function FriendPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const locale = useLocale()
  const t = T[locale === 'ar' ? 'ar' : 'en']
  const router = useRouter()
  const [info, setInfo] = useState<{ inviter_first_name: string | null; status: 'open' | 'used' } | null>(null)
  const [err, setErr] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [needTick, setNeedTick] = useState(false)

  useEffect(() => {
    getFriendInvite(token).then(setInfo).catch((e: unknown) => setErr(e instanceof Error && e.message === 'link_expired' ? 'expired' : 'invalid'))
  }, [token])

  let body: React.ReactNode = <p className="text-center text-charcoal/50">…</p>
  if (err) body = <p className="text-center text-charcoal">{err === 'expired' ? t.expired : t.invalid}</p>
  else if (info?.status === 'used') body = <p className="text-center text-charcoal">{t.used}</p>
  else if (info) body = (
    <>
      <h1 className="text-lg font-extrabold text-charcoal">{t.head(info.inviter_first_name)}</h1>
      <p className="mt-3 text-sm text-charcoal/70 leading-relaxed">{t.body}</p>
      <label className="mt-4 flex items-start gap-2 text-sm text-charcoal/80 cursor-pointer">
        <input type="checkbox" checked={agreed} onChange={e => { setAgreed(e.target.checked); setNeedTick(false) }} className="mt-0.5 w-4 h-4 shrink-0" />
        <span>{t.consent}</span>
      </label>
      {needTick && <p className="mt-2 text-sm text-red-600">{t.consentNeeded}</p>}
      <button type="button" data-track="friend_start_assessment"
        onClick={() => {
          if (!agreed) { setNeedTick(true); return }
          try { window.localStorage.setItem(FRIEND_KEY, token); window.localStorage.setItem(FRIEND_CONSENT_KEY, token) } catch { /* the gate then skips the comparison */ }
          track('friend_invite_opened', { lang: locale })
          router.push('/assessment')
        }}
        className="mt-5 block w-full text-center px-4 py-3 rounded-xl bg-primary text-white text-sm font-semibold">{t.cta}</button>
    </>
  )
  return (
    <div className="min-h-screen brand-surface flex items-center justify-center px-4" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="card p-8 w-full max-w-md">{body}</div>
    </div>
  )
}
