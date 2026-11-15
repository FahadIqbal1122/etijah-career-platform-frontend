'use client'

import { useCallback, useEffect, useState } from 'react'
import { getMyFriendInvites, getFriendCompare, agreeFriendFull, type FriendCompare } from '@/lib/api'
import { friendInviteOn } from '@/lib/friendInvite'
import { track, trackOnce } from '@/lib/analytics'

type Bi = { en: string; ar: string }
const DIM: Record<string, Bi> = {
  communication: { en: 'communicating', ar: 'التواصل' }, execution: { en: 'getting things done', ar: 'إنجاز المهام' },
  leadership: { en: 'leading', ar: 'القيادة' }, learning: { en: 'learning new things', ar: 'تعلّم الجديد' },
  relationships: { en: 'building relationships', ar: 'بناء العلاقات' }, strategic: { en: 'strategic thinking', ar: 'التفكير الاستراتيجي' },
}
const TYPE: Record<string, Bi> = {
  realistic: { en: 'Realistic', ar: 'العملي' }, investigative: { en: 'Investigative', ar: 'الاستقصائي' }, artistic: { en: 'Artistic', ar: 'الفني' },
  social: { en: 'Social', ar: 'الاجتماعي' }, enterprising: { en: 'Enterprising', ar: 'الريادي' }, conventional: { en: 'Conventional', ar: 'التقليدي' },
}
const T = {
  en: {
    title: (n: string) => `You and ${n}`,
    need: (n: string) => `To open the comparison with ${n}, agree that they will see: your first name, the careers you share, who should lead a project, and which strengths you have more of. They never see your scores or answers.`,
    agree: 'I agree', error: 'Something went wrong. Please try again.',
    waitConsent: (n: string) => `Waiting for ${n} to agree.`, waitReport: (n: string) => `Waiting for ${n} to finish their full report.`,
    same: (n: string) => `You and ${n} are drawn to the same kind of careers.`, partly: (n: string) => `You and ${n} share part of your direction.`,
    different: (n: string) => `You and ${n} lean toward different paths. That can work well if you help each other.`,
    careers: 'Careers you both rank high', types: 'Interests you share', lead: 'On a group project',
    leadA: (n: string) => `You lead and ${n} keeps things on track.`, leadB: (n: string) => `${n} leads and you keep things on track.`, leadShared: 'You can share the lead.',
    comp: 'Where you complement each other', youStronger: (d: string) => `You are stronger at ${d}.`, theyStronger: (n: string, d: string) => `${n} is stronger at ${d}.`,
    note: 'A starting point for a conversation, not a prediction.',
  },
  ar: {
    title: (n: string) => `أنت و${n}`,
    need: (n: string) => `لفتح المقارنة مع ${n}، وافق على أن يرى: اسمك الأول، والمهن المشتركة بينكما، ومن يقود المشروع، ونقاط القوة التي تتفوق فيها. لا يرى درجاتك ولا إجاباتك أبداً.`,
    agree: 'أوافق', error: 'حدث خطأ. حاول مرة أخرى.',
    waitConsent: (n: string) => `بانتظار موافقة ${n}.`, waitReport: (n: string) => `بانتظار أن ينهي ${n} تقريره الكامل.`,
    same: (n: string) => `أنت و${n} تنجذبان إلى النوع نفسه من المهن.`, partly: (n: string) => `أنت و${n} تتشاركان جزءاً من الاتجاه.`,
    different: (n: string) => `أنت و${n} تميلان إلى مسارين مختلفين، وهذا قد ينجح إذا ساعد كل منكما الآخر.`,
    careers: 'مهن يرتّبها كلاكما في المقدمة', types: 'اهتمامات مشتركة', lead: 'في مشروع جماعي',
    leadA: (n: string) => `أنت تقود و${n} يبقي العمل على المسار.`, leadB: (n: string) => `${n} يقود وأنت تبقي العمل على المسار.`, leadShared: 'يمكنكما تقاسم القيادة.',
    comp: 'أين يكمّل كل منكما الآخر', youStronger: (d: string) => `أنت أقوى في ${d}.`, theyStronger: (n: string, d: string) => `${n} أقوى في ${d}.`,
    note: 'نقطة بداية للحوار، وليست توقعاً.',
  },
}

function Row({ token, locale }: { token: string; locale: 'en' | 'ar' }) {
  const s = T[locale]
  const [res, setRes] = useState<FriendCompare | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const load = useCallback(() => { getFriendCompare(token).then(setRes).catch(() => {}) }, [token])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (res?.status === 'ready') trackOnce(`friend_comparison_shown:${token}`, 'friend_comparison_shown', { lang: locale }) }, [res?.status, token, locale])

  if (!res || res.status === 'off' || res.status === 'waiting_friend' || res.status === 'need_my_report') return null
  const n = res.friend_first_name || (locale === 'ar' ? 'صديقك' : 'your friend')
  const c = res.comparison
  return (
    <div className="rp-card p-4 space-y-3" data-track="friend_comparison">
      <h3 className="text-base font-extrabold text-charcoal">{s.title(n)}</h3>
      {res.status === 'need_my_consent' && (
        <>
          <p className="text-sm text-charcoal/80">{s.need(n)}</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="button" disabled={busy} data-track="friend_full_agree"
            onClick={async () => { setBusy(true); setError(''); try { await agreeFriendFull(token); track('friend_full_consent', { lang: locale }); load() } catch { setError(s.error) } finally { setBusy(false) } }}
            className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50">{busy ? '…' : s.agree}</button>
        </>
      )}
      {res.status === 'waiting_friend_consent' && <p className="text-sm text-charcoal/70">{s.waitConsent(n)}</p>}
      {res.status === 'waiting_friend_report' && <p className="text-sm text-charcoal/70">{s.waitReport(n)}</p>}
      {res.status === 'ready' && c && (
        <div className="space-y-3 text-sm text-charcoal/90">
          <p className="font-semibold">{c.same_major === 'same' ? s.same(n) : c.same_major === 'partly' ? s.partly(n) : s.different(n)}</p>
          {c.shared_careers.length > 0 && <p><b>{s.careers}:</b> {c.shared_careers.join(locale === 'ar' ? '، ' : ', ')}</p>}
          {c.shared_types.length > 0 && <p><b>{s.types}:</b> {c.shared_types.map(t => TYPE[t]?.[locale] ?? t).join(locale === 'ar' ? '، ' : ', ')}</p>}
          {c.lead && <p><b>{s.lead}:</b> {c.lead === 'a' ? s.leadA(n) : c.lead === 'b' ? s.leadB(n) : s.leadShared}</p>}
          {c.complement && c.complement.length > 0 && (
            <div><p className="font-bold">{s.comp}</p>
              <ul className="list-disc ps-5 space-y-1">
                {c.complement.map(x => <li key={x.dimension}>{x.stronger === 'a' ? s.youStronger(DIM[x.dimension]?.[locale] ?? x.dimension) : s.theyStronger(n, DIM[x.dimension]?.[locale] ?? x.dimension)}</li>)}
              </ul></div>
          )}
          <p className="text-xs text-charcoal/60">{s.note}</p>
        </div>
      )}
    </div>
  )
}

// On the paid report: the fuller comparison with each friend who joined an invite. Hidden unless the friend switch is on.
export default function FriendComparison({ locale }: { locale: string }) {
  const [tokens, setTokens] = useState<string[]>([])
  const [on, setOn] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the switch once on the client
  useEffect(() => { setOn(friendInviteOn()) }, [])
  useEffect(() => {
    if (!on) return
    getMyFriendInvites().then(r => setTokens(r.invites.filter(i => i.status === 'joined').map(i => i.token))).catch(() => {})
  }, [on])
  if (!on || tokens.length === 0) return null
  return <div className="space-y-3 my-4">{tokens.map(t => <Row key={t} token={t} locale={locale === 'ar' ? 'ar' : 'en'} />)}</div>
}
