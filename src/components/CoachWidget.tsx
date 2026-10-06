'use client'

// The coach: an avatar that is always on screen, a one-way tip bubble above it, and a chat
// panel (Gemini, POST /coach/chat) that opens when the avatar is tapped. The backend decides
// what the model may know: nothing during the assessment, only the profile summary on results.
// The same panel also hosts the beta feedback questions (see CoachFeedback).

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { apiAuthPost } from '@/lib/api'
import type { Bi } from '@/data/coachMessages'
import CoachFeedback, { feedbackThanks, type FeedbackKind } from '@/components/CoachFeedback'
import BreakGame, { pickNextGame, type GameState } from '@/components/BreakGame'
import { breakCopy } from '@/data/breakActivities'
import { pushTelemetry } from '@/lib/telemetry'

type Role = 'user' | 'coach'
interface Msg { role: Role; text: string }

export interface CoachFeedbackConfig {
  kind: FeedbackKind
  responseId: string
  onDone: () => void
  // Open the panel on the feedback card as soon as this turns true (once).
  autoOpen?: boolean
  // Short line shown in the tip bubble while the panel is closed and feedback is pending.
  nudge?: Bi
  // true = the report is held back until this is answered, so the panel can't be closed meanwhile.
  required?: boolean
}

export type Spot = HTMLElement | 'start' | 'end' | null

interface Props {
  locale: 'en' | 'ar'
  mode: 'assessment' | 'results' | 'landing'
  responseId?: string                    // results mode
  sessionId?: () => string               // assessment / landing mode: stable per-browser id (rate limiting only)
  questionIndex?: number                 // assessment mode, 1-based
  questionTotal?: number
  // assessment mode: the question currently on screen, so she can explain it (called when a message is sent)
  getQuestion?: () => { text: string; type?: string; options?: string[] } | null
  place?: 'end' | 'start' | 'center'      // which bottom spot she is at; changing it glides her across
  // Places she can stand during the assessment, rotated by spotIndex (she moves on every tip): an element to glide
  // to (she stands centred on it) or a screen corner. `wide` is used at >= 900px, `narrow` below.
  spots?: { wide: Spot[]; narrow: Spot[] }
  spotIndex?: number
  // Offer the riddle / mini-games (they play inside her panel). tipOffersGame adds the button to the current tip.
  games?: boolean
  // Quick questions shown as chips until the visitor sends their first message (landing page).
  suggestions?: Bi[]
  tipOffersGame?: boolean
  tip?: Bi | null
  onTipDismiss?: () => void
  tipAutoHideMs?: number
  feedback?: CoachFeedbackConfig
}

const T = {
  greetAssessment: {
    en: 'Hi, I’m Sarah, your coach. Ask me anything about how the assessment works. For career questions, finish the assessment first and I’ll help once you see your results.',
    ar: 'مرحباً، أنا سارة، مدرّبتك. اسألني عن طريقة عمل التقييم. أما أسئلة المسار المهني فأكمل التقييم أولاً وسأساعدك عندما ترى نتائجك.',
  },
  greetResults: {
    en: 'Hi, I’m Sarah, your coach. Ask me anything about your results and what they mean.',
    ar: 'مرحباً، أنا سارة، مدرّبتك. اسألني عن نتائجك وماذا تعني.',
  },
  greetLanding: {
    en: 'Hi, I’m Sarah. Ask me anything about Etijahi: how the assessment works, what each plan includes, pricing, or how to get in touch.',
    ar: 'مرحباً، أنا سارة. اسألني عن اتجاهي: كيف يعمل التقييم، وماذا تتضمن كل باقة، والأسعار، وطرق التواصل.',
  },
  placeholder: { en: 'Type your question…', ar: 'اكتب سؤالك…' },
  send: { en: 'Send', ar: 'إرسال' },
  close: { en: 'Close', ar: 'إغلاق' },
  open: { en: 'Chat with Sarah', ar: 'تحدث مع سارة' },
  thinking: { en: '…', ar: '…' },
  error: { en: 'I couldn’t answer that just now. Please try again in a moment.', ar: 'لم أستطع الإجابة الآن. حاول مرة أخرى بعد قليل.' },
  limited: { en: 'I’ll take a short rest from chatting now. Keep going, you’re doing great!', ar: 'سآخذ استراحة قصيرة من الدردشة الآن. واصل، أنت تبلي بلاءً حسناً!' },
  askInstead: { en: 'Ask Sarah a question instead', ar: 'اسأل سارة سؤالاً بدلاً من ذلك' },
  backToChat: { en: 'Back to chat', ar: 'العودة إلى المحادثة' },
  tooMany: { en: 'You’ve asked a lot of questions. Please try again a bit later.', ar: 'لقد سألت الكثير من الأسئلة. حاول مرة أخرى لاحقاً.' },
} satisfies Record<string, Bi>

export default function CoachWidget({
  locale, mode, responseId, sessionId, questionIndex, questionTotal, getQuestion,
  place = 'end', spots, spotIndex = 0, games = false, suggestions, tipOffersGame = false,
  tip = null, onTipDismiss, tipAutoHideMs = 9000, feedback,
}: Props) {
  const isAr = locale === 'ar'
  const tr = (b: Bi) => b[locale]

  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [rested, setRested] = useState(false)
  const [fbDone, setFbDone] = useState(false)
  const [autoOpened, setAutoOpened] = useState(false)
  const [shownTip, setShownTip] = useState<Bi | null>(null)
  // When the feedback questions are showing, the panel is feedback-only; this lets the reader switch to chat instead.
  const [chatInstead, setChatInstead] = useState(false)
  // After the last answer the thank-you stays up for a moment, then the panel closes.
  const [thanksKind, setThanksKind] = useState<FeedbackKind | null>(null)
  // Rendered through a portal into <body>: an ancestor with an animation/transform (the results page's fade-in)
  // would otherwise become the containing block for position:fixed and make her scroll away with the page.
  const inBrowser = useSyncExternalStore(() => () => {}, () => true, () => false)
  const scrollRef = useRef<HTMLDivElement>(null)
  // Riddle / mini-game shown inside the panel (null = normal chat view)
  const [game, setGame] = useState<GameState | null>(null)
  // The anchor (left panel) only exists on wide screens; below 900px she stays in the corner.
  const wide = useSyncExternalStore(
    cb => { const mq = window.matchMedia('(min-width: 900px)'); mq.addEventListener('change', cb); return () => mq.removeEventListener('change', cb) },
    () => window.matchMedia('(min-width: 900px)').matches,
    () => false,
  )
  // A spot whose element is not displayed (hidden by CSS on this screen size) is skipped.
  const list = spots ? (wide ? spots.wide : spots.narrow).filter((x): x is NonNullable<Spot> => !!x && (typeof x !== 'object' || x.offsetParent !== null)) : []
  const spot = list.length ? list[spotIndex % list.length] : null
  const target = spot && typeof spot === 'object' ? spot : null
  const effPlace: 'end' | 'start' | 'center' | 'target' = spot === 'start' || spot === 'end' ? spot : target ? 'target' : place

  // Where the target element is on screen (she is centred on it and glides there). Measured in observer/event
  // callbacks, which also fire once on observe.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  // The slow pop-in only plays the first time she arrives on a spot.
  const [arrived, setArrived] = useState(false)
  useEffect(() => {
    if (!target) return
    const measure = () => {
      const r = target.getBoundingClientRect()
      // keep her clear of the top bar (logo, report a bug, language) and the screen edges
      setPos({
        x: Math.min(Math.max(r.left + r.width / 2, 70), window.innerWidth - 70),
        y: Math.min(Math.max(r.top + r.height / 2, 150), window.innerHeight - 70),
      })
    }
    const ro = new ResizeObserver(measure)
    ro.observe(target); ro.observe(document.body)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true) }
  }, [target])

  // Derived-state updates during render (keeps these out of effects).
  if (feedback?.autoOpen && !autoOpened) { setAutoOpened(true); setOpen(true) }
  if (tip && tip !== shownTip) setShownTip(tip)

  const feedbackActive = !!feedback && !fbDone
  // Feedback-only panel: shown once the feedback has been triggered (loading screen, or the reader reached the
  // end of the report). Before that, and after it is answered, the panel is the normal chat.
  const feedbackMode = feedbackActive && !!feedback?.autoOpen && !chatInstead
  const required = feedbackActive && !!feedback?.required

  // Tip auto-hide (only while the panel is closed).
  useEffect(() => {
    if (!tip || !tipAutoHideMs || open || !onTipDismiss) return
    const id = setTimeout(onTipDismiss, tipAutoHideMs)
    return () => clearTimeout(id)
  }, [tip, tipAutoHideMs, open, onTipDismiss])

  useEffect(() => {
    if (!thanksKind) return
    const id = setTimeout(() => { setThanksKind(null); setOpen(false) }, 2600)
    return () => clearTimeout(id)
  }, [thanksKind])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [msgs, sending, open, fbDone])

  // Keep the bubble / panel on screen when she stands near an edge, and flip them below her near the top.
  const vw = inBrowser ? window.innerWidth : 0
  const clampShift = (width: number) => {
    if (!pos) return 0
    const w = Math.min(width, vw - 24)
    const want = pos.x - w / 2
    return Math.max(12, Math.min(want, vw - w - 12)) - want
  }
  const targetStyle = effPlace === 'target'
    ? ({
        left: pos?.x ?? -999, top: pos?.y ?? -999, opacity: pos ? undefined : 0,
        '--shift-panel': `${clampShift(380)}px`, '--shift-tip': `${clampShift(280)}px`,
      } as React.CSSProperties)
    : undefined
  const panelBelow = effPlace === 'target' && !!pos && pos.y - 56 < 440
  const tipBelow = effPlace === 'target' && !!pos && pos.y - 56 < 130

  const greeting = mode === 'results' ? tr(T.greetResults) : mode === 'landing' ? tr(T.greetLanding) : tr(T.greetAssessment)
  const nudge = feedbackActive && !open ? feedback?.nudge : undefined
  const bubbleText = !open ? (nudge ? tr(nudge) : tip ? tr(tip) : null) : null
  const bubbleVisible = !!bubbleText
  const bubbleShown = nudge ? tr(nudge) : shownTip ? tr(shownTip) : ''

  function startGame() {
    const next = pickNextGame(game)
    setGame(next)
    setOpen(true)
    if (tip) onTipDismiss?.()
    pushTelemetry({ event_type: 'break_open', activity_kind: next.kind })
  }

  function toggleOpen() {
    if (open) { if (!required) setOpen(false); return }   // a required feedback card keeps the panel open
    setOpen(true)
    if (tip) onTipDismiss?.()
  }

  async function send(preset?: string) {
    const text = (preset ?? input).trim()
    if (!text || sending || rested) return
    const history = msgs.slice(-6)
    const qc = mode === 'assessment' ? getQuestion?.() ?? null : null
    setMsgs(m => [...m, { role: 'user', text }])
    setInput('')
    setSending(true)
    try {
      const res = await apiAuthPost<{ reply: string | null; limited: boolean }>('/coach/chat', {
        mode, message: text, history, locale,
        response_id: mode === 'results' ? responseId : undefined,
        session_id: mode !== 'results' ? sessionId?.() : undefined,
        question_index: questionIndex, question_total: questionTotal,
        question_text: qc?.text || undefined, question_type: qc?.type, question_options: qc?.options,
      })
      if (res.limited || !res.reply) {
        setRested(true)
        setMsgs(m => [...m, { role: 'coach', text: tr(T.limited) }])
      } else {
        setMsgs(m => [...m, { role: 'coach', text: res.reply as string }])
      }
    } catch (e) {
      const tooMany = e instanceof Error && /too many/i.test(e.message)
      setMsgs(m => [...m, { role: 'coach', text: tr(tooMany ? T.tooMany : T.error) }])
    } finally {
      setSending(false)
    }
  }

  const widget = (
    <div className={`coach-widget ${open ? 'is-open' : ''} ${panelBelow ? 'panel-below' : ''} ${tipBelow ? 'tip-below' : ''} ${arrived ? 'has-arrived' : ''}`} data-place={effPlace}
      onAnimationEnd={e => { if (e.target === e.currentTarget && effPlace === 'target') setArrived(true) }} style={targetStyle} dir={isAr ? 'rtl' : 'ltr'}>
      {open && (
        <div className="coach-panel" role="dialog" aria-label="Sarah">
          {!required && (
            <button className="coach-close" onClick={() => setOpen(false)} aria-label={tr(T.close)}>✕</button>
          )}
          {thanksKind ? (
            <div className="coach-panel-scroll coach-panel-feedback">
              <div className="coach-msg coach-msg-coach coach-msg-card"><p className="coach-fb-thanks">{feedbackThanks(thanksKind, locale)}</p></div>
            </div>
          ) : feedbackMode && feedback ? (
            <div className="coach-panel-scroll coach-panel-feedback">
              <div className="coach-msg coach-msg-coach coach-msg-card">
                <CoachFeedback
                  kind={feedback.kind} responseId={feedback.responseId} locale={locale}
                  onDone={() => { setThanksKind(feedback.kind); setFbDone(true); feedback.onDone() }}
                />
              </div>
              <button type="button" className="coach-link" onClick={() => setChatInstead(true)}>{tr(T.askInstead)}</button>
            </div>
          ) : game ? (
            <div className="coach-panel-scroll coach-panel-game">
              <BreakGame
                key={game.n} locale={locale} game={game}
                onAnother={startGame} onExit={() => setGame(null)} exitLabel={tr(T.backToChat)}
              />
            </div>
          ) : (
            <>
              <div className="coach-panel-scroll" ref={scrollRef}>
                <div className="coach-msg coach-msg-coach">{greeting}</div>
                {msgs.map((m, i) => (
                  <div key={i} className={`coach-msg ${m.role === 'user' ? 'coach-msg-user' : 'coach-msg-coach'}`}>{m.text}</div>
                ))}
                {sending && <div className="coach-msg coach-msg-coach coach-typing">{tr(T.thinking)}</div>}
              </div>
              {suggestions && !msgs.length && (
                <div className="coach-chips">
                  {suggestions.map(sg => (
                    <button key={sg.en} type="button" disabled={sending} onClick={() => void send(tr(sg))}>{tr(sg)}</button>
                  ))}
                </div>
              )}
              {games && (
                <div className="coach-chips">
                  <button type="button" onClick={startGame}>{breakCopy.trigger[locale]}</button>
                </div>
              )}
              <form className="coach-input" onSubmit={e => { e.preventDefault(); void send() }}>
                <input
                  value={input} onChange={e => setInput(e.target.value)} maxLength={500}
                  placeholder={tr(T.placeholder)} disabled={rested} aria-label={tr(T.placeholder)}
                />
                <button type="submit" disabled={sending || rested || !input.trim()}>{tr(T.send)}</button>
              </form>
            </>
          )}
        </div>
      )}

      {!open && (
        <div className={`coach-speech coach-speech-tip ${bubbleVisible ? 'is-in' : 'is-out'}`} role="status" aria-live="polite">
          {tip && !nudge && onTipDismiss && (
            <button className="coach-close" onClick={onTipDismiss} aria-label={tr(T.close)}>✕</button>
          )}
          <p>{bubbleShown}</p>
          {games && tipOffersGame && tip && !nudge && (
            <button type="button" className="coach-tip-action" onClick={startGame}>{breakCopy.trigger[locale]}</button>
          )}
        </div>
      )}

      <button
        type="button" className={`coach-avatar coach-avatar-btn ${bubbleVisible ? 'is-nudging' : ''}`}
        onClick={toggleOpen}
        aria-label={tr(T.open)} aria-expanded={open}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/coach-avatar.jpg" alt="" width={112} height={112} />
      </button>
    </div>
  )
  return inBrowser ? createPortal(widget, document.body) : null
}
