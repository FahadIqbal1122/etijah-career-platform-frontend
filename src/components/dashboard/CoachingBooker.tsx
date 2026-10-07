'use client'

// Launchpad 1:1 coaching: shows the user's upcoming sessions (with Meet link) and lets them pick a free slot.
// Slots come from our own scheduler (backend /coaching/*, which talks to the Etijah academy) as UTC times and are
// shown in the viewer's own timezone.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiAuthGet, apiAuthPost } from '@/lib/api'

type Upcoming = { id: number; start: string; end: string; meet_url: string | null; can_cancel: boolean }
type Status = { sessions_remaining: number; upcoming: Upcoming[] }
type Slots = { slots: string[]; duration_minutes: number | null; sessions_remaining: number }

const S = {
  en: {
    loading: 'Loading your sessions…',
    unavailable: 'Booking is temporarily unavailable. Please contact us and we will arrange your session.',
    upcoming: 'Your upcoming session', join: 'Join on Google Meet', cancel: 'Cancel session', cancelling: 'Cancelling…',
    cancelConfirm: 'Cancel this session? Your session credit will be returned.',
    pick: 'Pick a day and time', minutes: 'min', timesIn: 'Times shown in your timezone',
    noSlots: 'No free times in the next few weeks. Please contact us and we will find a time for you.',
    confirm: 'Confirm booking', booking: 'Booking…', booked: 'Your session is booked. A calendar invite with the Meet link is on its way to your email.',
    noSessions: 'You have used your coaching session.',
    slot_unavailable: 'That time was just taken. Please pick another.',
    no_sessions_remaining: 'You have no sessions left to book.',
    too_late_to_cancel: 'It is too late to cancel this session online. Please contact us.',
    generic: 'Something went wrong. Please try again.',
  },
  ar: {
    loading: 'جارٍ تحميل جلساتك…',
    unavailable: 'الحجز غير متاح مؤقتاً. تواصل معنا وسنرتب جلستك.',
    upcoming: 'جلستك القادمة', join: 'انضم عبر Google Meet', cancel: 'إلغاء الجلسة', cancelling: 'جارٍ الإلغاء…',
    cancelConfirm: 'إلغاء هذه الجلسة؟ سيُعاد رصيد جلستك.',
    pick: 'اختر اليوم والوقت', minutes: 'دقيقة', timesIn: 'الأوقات معروضة بتوقيتك المحلي',
    noSlots: 'لا توجد أوقات متاحة خلال الأسابيع القادمة. تواصل معنا وسنجد لك وقتاً.',
    confirm: 'تأكيد الحجز', booking: 'جارٍ الحجز…', booked: 'تم حجز جلستك. ستصلك دعوة تقويم برابط Meet على بريدك.',
    noSessions: 'لقد استخدمت جلسة التدريب الخاصة بك.',
    slot_unavailable: 'تم حجز هذا الوقت للتو. اختر وقتاً آخر.',
    no_sessions_remaining: 'لا توجد لديك جلسات متبقية للحجز.',
    too_late_to_cancel: 'فات وقت الإلغاء عبر الموقع. تواصل معنا.',
    generic: 'حدث خطأ ما. حاول مرة أخرى.',
  },
} as const

export default function CoachingBooker({ lang }: { lang: 'en' | 'ar' }) {
  const t = S[lang]
  const loc = lang === 'ar' ? 'ar' : 'en-GB'
  const [status, setStatus] = useState<Status | null>(null)
  const [slots, setSlots] = useState<Slots | null>(null)
  const [failed, setFailed] = useState(false)
  const [day, setDay] = useState<string | null>(null)
  const [slot, setSlot] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const st = await apiAuthGet<Status>('/coaching/status')
      setStatus(st)
      setSlots(st.sessions_remaining > 0 ? await apiAuthGet<Slots>('/coaching/slots') : null)
      setFailed(false)
    } catch {
      setFailed(true)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA') // local YYYY-MM-DD
  const byDay = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const iso of slots?.slots ?? []) {
      const k = dayKey(iso)
      m.set(k, [...(m.get(k) ?? []), iso])
    }
    return m
  }, [slots])

  useEffect(() => {
    if (!day || !byDay.has(day)) setDay([...byDay.keys()][0] ?? null)
  }, [byDay, day])

  const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(loc, { weekday: 'short', day: 'numeric', month: 'short' })
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })
  const errText = (e: unknown) => {
    const msg = e instanceof Error ? e.message : ''
    const known = (['slot_unavailable', 'no_sessions_remaining', 'too_late_to_cancel'] as const).find(k => msg.includes(k))
    return known ? t[known] : t.generic
  }

  const book = async () => {
    if (!slot) return
    setBusy(true); setError(null); setMessage(null)
    try {
      setStatus(await apiAuthPost<Status>('/coaching/book', { start: slot }))
      setSlot(null); setSlots(null); setMessage(t.booked)
    } catch (e) {
      setError(errText(e))
      load()
    } finally { setBusy(false) }
  }

  const cancel = async (id: number) => {
    if (!window.confirm(t.cancelConfirm)) return
    setBusy(true); setError(null); setMessage(null)
    try {
      await apiAuthPost<Status>('/coaching/cancel', { booking_id: id })
      await load()
    } catch (e) {
      setError(errText(e))
    } finally { setBusy(false) }
  }

  if (failed) return <p className="text-xs text-charcoal/55 mt-1">{t.unavailable}</p>
  if (!status) return <p className="text-xs text-charcoal/55 mt-1">{t.loading}</p>

  return (
    <div className="mt-3 space-y-4">
      {message && <p className="text-sm text-primary">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {status.upcoming.map(u => (
        <div key={u.id} className="rounded-xl border border-[var(--line)] p-4">
          <p className="text-xs text-charcoal/55">{t.upcoming}</p>
          <p className="text-sm font-bold text-charcoal mt-1">{fmtDay(u.start)} · {fmtTime(u.start)} – {fmtTime(u.end)}</p>
          <div className="flex flex-wrap gap-3 mt-3">
            {u.meet_url && (
              <a href={u.meet_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium">{t.join}</a>
            )}
            {u.can_cancel && (
              <button onClick={() => cancel(u.id)} disabled={busy}
                className="px-4 py-2.5 rounded-xl border border-[var(--line)] text-sm text-charcoal disabled:opacity-50">
                {busy ? t.cancelling : t.cancel}
              </button>
            )}
          </div>
        </div>
      ))}

      {status.sessions_remaining > 0 && slots && (
        byDay.size === 0 ? (
          <p className="text-xs text-charcoal/55">{t.noSlots}</p>
        ) : (
          <div>
            <p className="text-sm font-bold text-charcoal">{t.pick}{slots.duration_minutes ? ` · ${slots.duration_minutes} ${t.minutes}` : ''}</p>
            <p className="text-xs text-charcoal/45 mt-0.5">{t.timesIn}</p>
            <div className="flex gap-2 overflow-x-auto py-3">
              {[...byDay.keys()].map(k => (
                <button key={k} onClick={() => { setDay(k); setSlot(null) }}
                  className={`shrink-0 px-3 py-2 rounded-xl border text-xs ${day === k ? 'bg-primary text-white border-primary' : 'border-[var(--line)] text-charcoal'}`}>
                  {fmtDay(byDay.get(k)![0])}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {(day ? byDay.get(day) ?? [] : []).map(iso => (
                <button key={iso} onClick={() => setSlot(iso)} dir="ltr"
                  className={`px-3 py-2 rounded-xl border text-sm ${slot === iso ? 'bg-primary text-white border-primary' : 'border-[var(--line)] text-charcoal'}`}>
                  {fmtTime(iso)}
                </button>
              ))}
            </div>
            <button onClick={book} disabled={!slot || busy}
              className="mt-4 inline-flex items-center px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-40">
              {busy ? t.booking : t.confirm}
            </button>
          </div>
        )
      )}

      {status.sessions_remaining === 0 && status.upcoming.length === 0 && <p className="text-xs text-charcoal/55">{t.noSessions}</p>}
    </div>
  )
}
