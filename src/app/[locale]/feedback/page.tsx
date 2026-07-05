'use client'

import { useState, useMemo } from 'react'

type ScaleValues = Record<string, number>
type Errors = Record<string, boolean>

const input = 'w-full text-sm text-slate-800 bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-accent focus:ring-2 focus:ring-teal/15 transition-colors'
const inputError = 'w-full text-sm text-slate-800 bg-white border border-red-400 rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-400/10 transition-colors'

export default function FeedbackPage() {
  const [fname, setFname] = useState('')
  const [email, setEmail] = useState('')
  const [age, setAge] = useState('')
  const [country, setCountry] = useState('')
  const [source, setSource] = useState('')
  const [accurate, setAccurate] = useState('')
  const [surprised, setSurprised] = useState('')
  // const [careersRelevant, setCareersRelevant] = useState('')
  // const [aiOutlook, setAiOutlook] = useState('')
  const [recommend, setRecommend] = useState('')
  const [other, setOther] = useState('')
  const [scales, setScales] = useState<ScaleValues>({})
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const progress = useMemo(() => {
    const filled =
      [accurate, surprised].filter(Boolean).length +
      (fname.trim() ? 1 : 0) +
      (email.trim() ? 1 : 0) +
      (age ? 1 : 0)
    return Math.round((filled / 5) * 100)
  }, [fname, email, age, accurate, surprised])

  function validate(): boolean {
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    const next: Errors = {
      fname: !fname.trim(),
      email: !email.trim() || !emailValid,
      age: !age,
      accurate: !accurate,
      surprised: !surprised,
      // 'careers-relevant': !careersRelevant,
      // 'ai-outlook': !aiOutlook,
    }
    setErrors(next)
    return !Object.values(next).some(Boolean)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fname: fname.trim(),
          email: email.trim().toLowerCase(),
          age,
          country: country || null,
          source: source || null,
          accurate: accurate || null,
          rating_careers: scales['scale-careers'] ?? null,
          rating_personality: scales['scale-personality'] ?? null,
          rating_clarity: scales['scale-clarity'] ?? null,
          rating_length: scales['scale-length'] ?? null,
          rating_overall: scales['scale-overall'] ?? null,
          surprised: surprised || null,
          // careers_relevant: careersRelevant || null,
          // ai_outlook: aiOutlook || null,
          recommend: recommend || null,
          other: other.trim() || null,
        }),
      })
      if (!res.ok) throw new Error('Submission failed')
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setSubmitError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen brand-surface flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-6">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1D4E4E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-primary mb-2">Thank you!</h2>
          <p className="text-sm text-slate-500 leading-relaxed">Your feedback has been received. We will be in touch within 24 hours to book your coaching session.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen brand-surface py-10 pb-20 px-4">
      <div className="max-w-[620px] mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 text-xs text-primary tracking-widest mb-5">
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
            Etijah · AI Career Compass
          </div>
          <h1 className="text-2xl font-semibold text-primary mb-2">Assessment feedback</h1>
          <p className="text-sm text-slate-500 leading-relaxed">Help us improve the tool. This takes about 3 minutes.</p>
        </div>

        {/* Progress */}
        <div className="h-1 bg-slate-200 rounded-full mb-8 overflow-hidden">
          <div className="h-full bg-teal rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-8">

          {/* ABOUT YOU */}
          <section>
            <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 pb-2 border-b border-slate-200 mb-5">About you</p>
            <div className="grid grid-cols-2 gap-3 mb-5 max-sm:grid-cols-1">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">First name <span className="text-red-500">*</span></label>
                <input className={errors.fname ? inputError : input} type="text" value={fname} onChange={e => setFname(e.target.value)} placeholder="Your name" />
                {errors.fname && <p className="text-xs text-red-500 mt-1">Please enter your name.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email <span className="text-red-500">*</span></label>
                <input className={errors.email ? inputError : input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="For session booking" />
                {errors.email && <p className="text-xs text-red-500 mt-1">Please enter a valid email.</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5 max-sm:grid-cols-1">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Age group <span className="text-red-500">*</span></label>
                <select className={errors.age ? inputError : input} value={age} onChange={e => setAge(e.target.value)}>
                  <option value="">Select…</option>
                  <option value="16-18">16 – 18</option>
                  <option value="19-22">19 – 22</option>
                  <option value="23-26">23 – 26</option>
                  <option value="27-35">27 – 35</option>
                </select>
                {errors.age && <p className="text-xs text-red-500 mt-1">Please select your age group.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Country</label>
                <select className={input} value={country} onChange={e => setCountry(e.target.value)}>
                  <option value="">Select…</option>
                  <option value="KSA">Saudi Arabia</option>
                  <option value="BH">Bahrain</option>
                  <option value="UAE">UAE</option>
                  <option value="KW">Kuwait</option>
                  <option value="QA">Qatar</option>
                  <option value="OM">Oman</option>
                  <option value="GCC_other">Other GCC</option>
                  <option value="non_GCC">Outside GCC</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">How did you hear about this?</label>
              <select className={input} value={source} onChange={e => setSource(e.target.value)}>
                <option value="">Select…</option>
                <option value="intern_network">Etijah team / intern network</option>
                <option value="employee">Employee referral</option>
                <option value="instagram">Instagram / social media</option>
                <option value="university">University partner</option>
                <option value="friend_family">Friend or family</option>
              </select>
            </div>
          </section>

          {/* ACCURACY */}
          <section>
            <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 pb-2 border-b border-slate-200 mb-5">How accurate did it feel?</p>
            <PillField
              label="Did your result feel accurate overall?"
              required
              options={[['yes', 'Yes, felt like me'], ['partially', 'Partially'], ['no', 'Not really']]}
              value={accurate}
              onChange={setAccurate}
              error={errors.accurate}
            />
            {/* <ScaleCard label="How accurate were the career suggestions?" lowLabel="Not accurate" highLabel="Very accurate" value={scales['scale-careers']} onChange={v => setScales(p => ({ ...p, 'scale-careers': v }))} /> */}
            <ScaleCard label="How well did the personality description match you?" lowLabel="Didn't match" highLabel="Matched perfectly" value={scales['scale-personality']} onChange={v => setScales(p => ({ ...p, 'scale-personality': v }))} />
          </section>

          {/* EXPERIENCE */}
          <section>
            <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 pb-2 border-b border-slate-200 mb-5">Your experience</p>
            <ScaleCard label="How easy was it to understand the questions?" lowLabel="Very confusing" highLabel="Very clear" value={scales['scale-clarity']} onChange={v => setScales(p => ({ ...p, 'scale-clarity': v }))} />
            <ScaleCard label="How did the length feel?" lowLabel="Too short" highLabel="Too long" value={scales['scale-length']} onChange={v => setScales(p => ({ ...p, 'scale-length': v }))} />
            <ScaleCard label="Overall, how would you rate the experience?" lowLabel="Poor" highLabel="Excellent" value={scales['scale-overall']} onChange={v => setScales(p => ({ ...p, 'scale-overall': v }))} />
          </section>

          {/* REFLECTION */}
          <section>
            <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 pb-2 border-b border-slate-200 mb-5">Quick reflections</p>
            <PillField label="Were you surprised by your results?" required options={[['yes', 'Yes'], ['a_little', 'A little'], ['no', 'No']]} value={surprised} onChange={setSurprised} error={errors.surprised} />
            {/* <PillField label="Did the career suggestions feel relevant to your life?" required options={[['yes', 'Yes'], ['some', 'Some of them'], ['no', 'Not really']]} value={careersRelevant} onChange={setCareersRelevant} error={errors['careers-relevant']} /> */}
            {/* <PillField label="Did the AI Career Outlook section change how you think about your future?" required options={[['yes', 'Yes, it did'], ['a_little', 'A little'], ['no', 'Not really']]} value={aiOutlook} onChange={setAiOutlook} error={errors['ai-outlook']} /> */}
            <PillField label="Would you recommend this tool to a friend?" required={false} options={[['yes', 'Yes'], ['maybe', 'Maybe'], ['no', 'No']]} value={recommend} onChange={setRecommend} error={false} />
          </section>

          {/* OPEN COMMENT */}
          <section>
            <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 pb-2 border-b border-slate-200 mb-5">Anything else?</p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Any other feedback for the team? <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                className={`${input} resize-y min-h-[80px] leading-relaxed`}
                value={other}
                onChange={e => setOther(e.target.value)}
                placeholder="Any comments, suggestions, or things that were unclear…"
              />
            </div>
          </section>

          {submitError && <p className="text-sm text-red-500 text-center">{submitError}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-primary hover:bg-primary-deep disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors"
          >
            {submitting ? 'Submitting…' : 'Submit feedback'}
          </button>
          <p className="text-xs text-slate-400 text-center">Fields marked <span className="text-red-500">*</span> are required.</p>

        </form>
      </div>
    </div>
  )
}

function ScaleCard({ label, lowLabel, highLabel, value, onChange }: {
  label: string
  lowLabel: string
  highLabel: string
  value: number | undefined
  onChange: (v: number) => void
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-3">
      <p className="text-sm font-medium text-slate-700 mb-3">{label}</p>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5, 6].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 h-11 rounded-lg text-sm font-medium border transition-colors ${
              value === n
                ? 'bg-primary border-primary text-white'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-primary hover:text-primary hover:bg-lightblue'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[11px] text-slate-400">{lowLabel}</span>
        <span className="text-[11px] text-slate-400">{highLabel}</span>
      </div>
    </div>
  )
}

function PillField({ label, required, options, value, onChange, error }: {
  label: string
  required: boolean
  options: [string, string][]
  value: string
  onChange: (v: string) => void
  error: boolean
}) {
  return (
    <div className="mb-5">
      <p className="text-sm font-medium text-slate-700 mb-2.5">
        {label} {required && <span className="text-red-500">*</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map(([val, lbl]) => (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            className={`px-4 py-2 rounded-full text-sm border transition-colors ${
              value === val
                ? 'bg-primary border-primary text-white font-medium'
                : error
                ? 'border-red-400 text-slate-500 bg-white hover:border-primary hover:text-primary'
                : 'border-slate-200 text-slate-500 bg-white hover:border-primary hover:text-primary'
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>
      {required && error && <p className="text-xs text-red-500 mt-1.5">Please select an option.</p>}
    </div>
  )
}
