'use client'

import { useEffect, useRef, useState } from 'react'
import { createFriendInvite, getMyFriendInvites, type FriendInvite } from '@/lib/api'
import { track, trackOnce } from '@/lib/analytics'

const T = {
  en: {
    btn: 'Invite a friend: see if you’re a good study match',
    explain: 'Your friend answers the same free questions. Then you both see one number: how well your interests match. Nobody sees anyone’s answers.',
    consent: 'I agree that my friend will see our match percentage and my first name.', consentNeeded: 'Please tick the box first.',
    make: 'Create my invite link', share: 'Share', copy: 'Copy link', copied: 'Copied', whatsapp: 'WhatsApp',
    shareText: 'Let’s see if we’re a good study match on Etijahi:', error: 'Something went wrong. Please try again.', needAccount: 'Fill in your name and email above first.',
    waiting: 'Waiting for your friend to finish the free questions.', joined: (n: string | null) => `${n ?? 'Your friend'} finished the free part.`,
    match: (n: string | null, p: number) => `Study match with ${n ?? 'your friend'}: ${p}%`, soon: 'Your match will show here soon.',
  },
  ar: {
    btn: 'ادعُ صديقاً: اعرف هل أنتما متوافقان في الدراسة',
    explain: 'يجيب صديقك عن الأسئلة المجانية نفسها. بعدها يظهر لكما رقم واحد: مدى توافق اهتماماتكما. لا يرى أحد إجابات الآخر.',
    consent: 'أوافق أن يرى صديقي نسبة التوافق بيننا واسمي الأول.', consentNeeded: 'يرجى تحديد المربع أولاً.',
    make: 'أنشئ رابط الدعوة', share: 'مشاركة', copy: 'نسخ الرابط', copied: 'تم النسخ', whatsapp: 'واتساب',
    shareText: 'لنرَ هل نتوافق في الدراسة على إتجاهي:', error: 'حدث خطأ. حاول مرة أخرى.', needAccount: 'أدخل اسمك وبريدك الإلكتروني في الأعلى أولاً.',
    waiting: 'بانتظار أن ينهي صديقك الأسئلة المجانية.', joined: (n: string | null) => `${n ?? 'صديقك'} أنهى الجزء المجاني.`,
    match: (n: string | null, p: number) => `التوافق الدراسي مع ${n ?? 'صديقك'}: ${p}٪`, soon: 'ستظهر نسبة التوافق هنا قريباً.',
  },
}

export default function FriendInvitePanel({ locale, signedIn = true, ensureAccount }: { locale: string; signedIn?: boolean; ensureAccount?: () => Promise<boolean> }) {
  const s = T[locale === 'ar' ? 'ar' : 'en']
  const [open, setOpen] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [link, setLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [invites, setInvites] = useState<FriendInvite[]>([])
  const [matchOn, setMatchOn] = useState(false)
  const alive = useRef(true)

  // The invites this student sent or accepted: checked now and every 30 seconds, so a friend finishing shows up while the gate is open.
  useEffect(() => {
    if (!signedIn) return
    alive.current = true
    const load = () => getMyFriendInvites().then(r => { if (alive.current) { setInvites(r.invites); setMatchOn(r.match_enabled) } }).catch(() => {})
    load()
    const id = window.setInterval(load, 30000)
    return () => { alive.current = false; window.clearInterval(id) }
  }, [signedIn])

  useEffect(() => {
    invites.forEach(i => { if (i.match_pct != null) trackOnce(`friend_match_shown:${i.token}`, 'friend_match_shown', { lang: locale, role: i.role }) })
  }, [invites, locale])

  async function make() {
    if (!agreed) { setError(s.consentNeeded); return }
    setBusy(true); setError('')
    try {
      if (ensureAccount && !(await ensureAccount())) { setError(s.needAccount); return }
      const r = await createFriendInvite(true, locale === 'ar' ? 'ar' : 'en')
      setLink(r.url)
      track('friend_invite_sent', { lang: locale })
      getMyFriendInvites().then(x => setInvites(x.invites)).catch(() => {})
    } catch { setError(s.error) } finally { setBusy(false) }
  }

  async function share() {
    try {
      if (navigator.share) { await navigator.share({ text: s.shareText, url: link }); return }
    } catch { return /* closed the share sheet */ }
    copy()
  }
  function copy() {
    try { navigator.clipboard.writeText(link); setCopied(true); window.setTimeout(() => setCopied(false), 2000) } catch { /* the link is shown, they can select it */ }
  }

  return (
    <div className="rounded-xl border border-[var(--line-strong)] bg-white/60 p-3 space-y-2" data-track="assessment_gate_friend_panel">
      {!open && !link && (
        <button type="button" onClick={() => setOpen(true)} data-track="assessment_gate_friend_open"
          className="w-full min-h-[44px] px-4 rounded-xl border border-primary text-primary text-sm font-semibold">{s.btn}</button>
      )}
      {open && !link && (
        <div className="space-y-2">
          <p className="text-xs text-charcoal/70">{s.explain}</p>
          <label className="flex items-start gap-2 text-xs text-charcoal/80 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={e => { setAgreed(e.target.checked); setError('') }} className="mt-0.5 w-4 h-4 shrink-0" />
            <span>{s.consent}</span>
          </label>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button type="button" onClick={make} disabled={busy} data-track="assessment_gate_friend_create"
            className="w-full min-h-[44px] px-4 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50">{busy ? '…' : s.make}</button>
        </div>
      )}
      {link && (
        <div className="space-y-2">
          <p className="text-xs break-all text-charcoal/70" dir="ltr">{link}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={share} className="min-h-[40px] px-3 rounded-full border border-primary text-primary text-xs font-semibold">{s.share}</button>
            <button type="button" onClick={copy} className="min-h-[40px] px-3 rounded-full border border-[var(--line-strong)] text-xs font-semibold text-charcoal">{copied ? s.copied : s.copy}</button>
            <a href={`https://wa.me/?text=${encodeURIComponent(`${s.shareText} ${link}`)}`} target="_blank" rel="noopener noreferrer"
              className="min-h-[40px] px-3 rounded-full border border-[var(--line-strong)] text-xs font-semibold text-charcoal inline-flex items-center">{s.whatsapp}</a>
          </div>
        </div>
      )}
      {invites.map(i => (
        <p key={i.token} className="text-xs text-charcoal/80">
          {i.status === 'waiting' ? s.waiting
            : i.match_pct != null ? <b>{s.match(i.other_first_name, i.match_pct)}</b>
            : <>{s.joined(i.other_first_name)} {!matchOn && s.soon}</>}
        </p>
      ))}
    </div>
  )
}
