'use client'

import { useState, useMemo } from 'react'

type ScaleValues = Record<string, number>
type Errors = Record<string, boolean>

const SCALE_GROUPS = ['scale-careers', 'scale-personality', 'scale-clarity', 'scale-length', 'scale-overall']

export default function FeedbackPage() {
  const [fname, setFname] = useState('')
  const [email, setEmail] = useState('')
  const [age, setAge] = useState('')
  const [country, setCountry] = useState('')
  const [source, setSource] = useState('')
  const [accurate, setAccurate] = useState('')
  const [surprised, setSurprised] = useState('')
  const [careersRelevant, setCareersRelevant] = useState('')
  const [aiOutlook, setAiOutlook] = useState('')
  const [recommend, setRecommend] = useState('')
  const [other, setOther] = useState('')
  const [scales, setScales] = useState<ScaleValues>({})
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const progress = useMemo(() => {
    const requiredRadios = [accurate, surprised, careersRelevant, aiOutlook]
    const filled = requiredRadios.filter(Boolean).length
      + (fname.trim() ? 1 : 0)
      + (email.trim() ? 1 : 0)
      + (age ? 1 : 0)
    return Math.round((filled / 7) * 100)
  }, [fname, email, age, accurate, surprised, careersRelevant, aiOutlook])

  function setScale(group: string, val: number) {
    setScales(prev => ({ ...prev, [group]: val }))
  }

  function validate(): boolean {
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    const next: Errors = {
      fname: !fname.trim(),
      email: !email.trim() || !emailValid,
      age: !age,
      accurate: !accurate,
      surprised: !surprised,
      'careers-relevant': !careersRelevant,
      'ai-outlook': !aiOutlook,
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
          careers_relevant: careersRelevant || null,
          ai_outlook: aiOutlook || null,
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

  function fieldClass(key: string) {
    return errors[key] ? 'field field-error' : 'field'
  }

  if (submitted) {
    return (
      <>
        <PageStyles />
        <div className="page-wrap">
          <div className="success-screen" style={{ display: 'block' }}>
            <div className="success-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2>Thank you!</h2>
            <p>Your feedback has been received. We will be in touch within 24 hours to book your coaching session.</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageStyles />
      <div className="page-wrap">
        <div className="form-header">
          <div className="logo-tag">Etijah · AI Career Compass</div>
          <h1>Assessment feedback</h1>
          <p>Help us improve the tool. This takes about 3 minutes.</p>
        </div>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <form onSubmit={handleSubmit} noValidate>

          {/* ABOUT YOU */}
          <div className="section">
            <div className="section-heading">About you</div>

            <div className="row-2">
              <div className={fieldClass('fname')} id="field-fname">
                <div className="field-label">First name <span className="req">*</span></div>
                <input type="text" value={fname} onChange={e => setFname(e.target.value)} placeholder="Your name" />
                <div className="error-msg">Please enter your name.</div>
              </div>
              <div className={fieldClass('email')} id="field-email">
                <div className="field-label">Email <span className="req">*</span></div>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="For session booking" />
                <div className="error-msg">Please enter a valid email.</div>
              </div>
            </div>

            <div className="row-2">
              <div className={fieldClass('age')} id="field-age">
                <div className="field-label">Age group <span className="req">*</span></div>
                <select value={age} onChange={e => setAge(e.target.value)}>
                  <option value="">Select…</option>
                  <option value="16-18">16 – 18</option>
                  <option value="19-22">19 – 22</option>
                  <option value="23-26">23 – 26</option>
                  <option value="27-35">27 – 35</option>
                </select>
                <div className="error-msg">Please select your age group.</div>
              </div>
              <div className="field">
                <div className="field-label">Country</div>
                <select value={country} onChange={e => setCountry(e.target.value)}>
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

            <div className="field">
              <div className="field-label">How did you hear about this?</div>
              <select value={source} onChange={e => setSource(e.target.value)}>
                <option value="">Select…</option>
                <option value="intern_network">Etijah team / intern network</option>
                <option value="employee">Employee referral</option>
                <option value="instagram">Instagram / social media</option>
                <option value="university">University partner</option>
                <option value="friend_family">Friend or family</option>
              </select>
            </div>
          </div>

          {/* ACCURACY */}
          <div className="section">
            <div className="section-heading">How accurate did it feel?</div>

            <div className={fieldClass('accurate')} id="field-accurate">
              <div className="field-label">Did your result feel accurate overall? <span className="req">*</span></div>
              <div className="pill-group">
                {[['yes', 'Yes, felt like me'], ['partially', 'Partially'], ['no', 'Not really']].map(([val, label]) => (
                  <div key={val} className="pill-option">
                    <input type="radio" id={`acc-${val}`} name="accurate" value={val} checked={accurate === val} onChange={() => setAccurate(val)} />
                    <label htmlFor={`acc-${val}`}>{label}</label>
                  </div>
                ))}
              </div>
              <div className="error-msg">Please select an option.</div>
            </div>

            <ScaleCard
              id="scale-careers"
              label="How accurate were the career suggestions?"
              lowLabel="Not accurate"
              highLabel="Very accurate"
              value={scales['scale-careers']}
              onChange={v => setScale('scale-careers', v)}
            />
            <ScaleCard
              id="scale-personality"
              label="How well did the personality description match you?"
              lowLabel="Didn't match"
              highLabel="Matched perfectly"
              value={scales['scale-personality']}
              onChange={v => setScale('scale-personality', v)}
            />
          </div>

          {/* EXPERIENCE */}
          <div className="section">
            <div className="section-heading">Your experience</div>
            <ScaleCard
              id="scale-clarity"
              label="How easy was it to understand the questions?"
              lowLabel="Very confusing"
              highLabel="Very clear"
              value={scales['scale-clarity']}
              onChange={v => setScale('scale-clarity', v)}
            />
            <ScaleCard
              id="scale-length"
              label="How did the length feel?"
              lowLabel="Too short"
              highLabel="Too long"
              value={scales['scale-length']}
              onChange={v => setScale('scale-length', v)}
            />
            <ScaleCard
              id="scale-overall"
              label="Overall, how would you rate the experience?"
              lowLabel="Poor"
              highLabel="Excellent"
              value={scales['scale-overall']}
              onChange={v => setScale('scale-overall', v)}
            />
          </div>

          {/* REFLECTION */}
          <div className="section">
            <div className="section-heading">Quick reflections</div>

            <PillField
              fieldId="surprised"
              label="Were you surprised by your results?"
              required
              options={[['yes', 'Yes'], ['a_little', 'A little'], ['no', 'No']]}
              value={surprised}
              onChange={setSurprised}
              error={errors['surprised']}
            />
            <PillField
              fieldId="careers-relevant"
              label="Did the career suggestions feel relevant to your life?"
              required
              options={[['yes', 'Yes'], ['some', 'Some of them'], ['no', 'Not really']]}
              value={careersRelevant}
              onChange={setCareersRelevant}
              error={errors['careers-relevant']}
            />
            <PillField
              fieldId="ai-outlook"
              label="Did the AI Career Outlook section change how you think about your future?"
              required
              options={[['yes', 'Yes, it did'], ['a_little', 'A little'], ['no', 'Not really']]}
              value={aiOutlook}
              onChange={setAiOutlook}
              error={errors['ai-outlook']}
            />
            <PillField
              fieldId="recommend"
              label="Would you recommend this tool to a friend?"
              required={false}
              options={[['yes', 'Yes'], ['maybe', 'Maybe'], ['no', 'No']]}
              value={recommend}
              onChange={setRecommend}
              error={false}
            />
          </div>

          {/* OPEN COMMENT */}
          <div className="section">
            <div className="section-heading">Anything else?</div>
            <div className="field">
              <div className="field-label">
                Any other feedback for the team?{' '}
                <span style={{ color: 'var(--text-hint)', fontWeight: 400, fontSize: 13 }}>(optional)</span>
              </div>
              <textarea
                value={other}
                onChange={e => setOther(e.target.value)}
                placeholder="Any comments, suggestions, or things that were unclear…"
              />
            </div>
          </div>

          {submitError && (
            <p style={{ color: '#C0392B', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{submitError}</p>
          )}

          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit feedback'}
          </button>
          <p className="form-note">Fields marked <span style={{ color: '#C0392B' }}>*</span> are required.</p>
        </form>
      </div>
    </>
  )
}

function ScaleCard({
  id, label, lowLabel, highLabel, value, onChange,
}: {
  id: string
  label: string
  lowLabel: string
  highLabel: string
  value: number | undefined
  onChange: (v: number) => void
}) {
  return (
    <div className="scale-card">
      <div className="field-label">{label}</div>
      <div className="scale-buttons">
        {[1, 2, 3, 4, 5, 6].map(n => (
          <button
            key={n}
            type="button"
            className={`scale-btn${value === n ? ' active' : ''}`}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="scale-meta">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  )
}

function PillField({
  fieldId, label, required, options, value, onChange, error,
}: {
  fieldId: string
  label: string
  required: boolean
  options: [string, string][]
  value: string
  onChange: (v: string) => void
  error: boolean
}) {
  return (
    <div className={`field${error ? ' field-error' : ''}`} id={`field-${fieldId}`}>
      <div className="field-label">
        {label} {required && <span className="req">*</span>}
      </div>
      <div className="pill-group">
        {options.map(([val, lbl]) => (
          <div key={val} className="pill-option">
            <input
              type="radio"
              id={`${fieldId}-${val}`}
              name={fieldId}
              value={val}
              checked={value === val}
              onChange={() => onChange(val)}
            />
            <label htmlFor={`${fieldId}-${val}`}>{lbl}</label>
          </div>
        ))}
      </div>
      {required && <div className="error-msg">Please select an option.</div>}
    </div>
  )
}

function PageStyles() {
  return (
    <style>{`
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      :root {
        --brand: #1D4E4E;
        --brand-light: #E8F4F4;
        --brand-mid: #2E6B6B;
        --text: #1A1A1A;
        --text-secondary: #5A5A5A;
        --text-hint: #9A9A9A;
        --border: #E0E0E0;
        --surface: #FFFFFF;
        --page-bg: #F5F3EE;
        --radius: 10px;
        --radius-sm: 6px;
      }

      body {
        font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
        background: var(--page-bg);
        color: var(--text);
        min-height: 100vh;
        padding: 2.5rem 1rem 5rem;
      }

      .page-wrap { max-width: 620px; margin: 0 auto; }
      .form-header { margin-bottom: 2rem; }

      .logo-tag {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: var(--brand);
        letter-spacing: .04em;
        margin-bottom: 1.25rem;
      }
      .logo-tag::before {
        content: '';
        display: block;
        width: 8px; height: 8px;
        border-radius: 50%;
        background: var(--brand);
      }

      .form-header h1 {
        font-size: 26px;
        font-weight: 600;
        color: var(--brand);
        margin-bottom: 8px;
      }
      .form-header p {
        font-size: 14px;
        color: var(--text-secondary);
        line-height: 1.6;
      }

      .progress-bar {
        height: 4px;
        background: var(--border);
        border-radius: 99px;
        margin-bottom: 2rem;
        overflow: hidden;
      }
      .progress-fill {
        height: 100%;
        background: var(--brand);
        border-radius: 99px;
        transition: width .3s ease;
      }

      .section { margin-bottom: 2rem; }
      .section-heading {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: .12em;
        text-transform: uppercase;
        color: var(--text-hint);
        margin-bottom: 1.25rem;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--border);
      }

      .field { margin-bottom: 1.5rem; }
      .field-label {
        font-size: 15px;
        font-weight: 500;
        color: var(--text);
        margin-bottom: 10px;
        line-height: 1.45;
      }
      .field-label .req { color: #C0392B; margin-left: 3px; }
      .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

      input[type="text"],
      input[type="email"],
      select,
      textarea {
        width: 100%;
        font-size: 14px;
        color: var(--text);
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 11px 14px;
        font-family: inherit;
        transition: border-color .15s;
        appearance: none;
        -webkit-appearance: none;
      }
      input:focus, select:focus, textarea:focus {
        outline: none;
        border-color: var(--brand);
        box-shadow: 0 0 0 3px rgba(29,78,78,.08);
      }
      select {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%235A5A5A' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 12px center;
        padding-right: 36px;
      }
      textarea { resize: vertical; min-height: 80px; line-height: 1.6; }

      .pill-group { display: flex; gap: 8px; flex-wrap: wrap; }
      .pill-option { position: relative; }
      .pill-option input[type="radio"] { position: absolute; opacity: 0; width: 0; height: 0; }
      .pill-option label {
        display: inline-block;
        padding: 9px 18px;
        border: 1px solid var(--border);
        border-radius: 99px;
        font-size: 14px;
        color: var(--text-secondary);
        cursor: pointer;
        background: var(--surface);
        transition: background .12s, border-color .12s, color .12s;
        user-select: none;
      }
      .pill-option input[type="radio"]:checked + label {
        background: var(--brand);
        border-color: var(--brand);
        color: #fff;
        font-weight: 500;
      }
      .pill-option label:hover { border-color: var(--brand); color: var(--brand); }

      .scale-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 1.25rem 1.25rem 1rem;
        margin-bottom: 1rem;
      }
      .scale-card .field-label { margin-bottom: 12px; }

      .scale-buttons { display: flex; gap: 6px; }
      .scale-btn {
        flex: 1;
        height: 48px;
        background: var(--page-bg);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        font-size: 15px;
        font-weight: 500;
        color: var(--text-secondary);
        cursor: pointer;
        transition: background .12s, border-color .12s, color .12s;
        font-family: inherit;
      }
      .scale-btn:hover { border-color: var(--brand-mid); color: var(--brand); background: var(--brand-light); }
      .scale-btn.active { background: var(--brand); border-color: var(--brand); color: #fff; }

      .scale-meta { display: flex; justify-content: space-between; margin-top: 6px; }
      .scale-meta span { font-size: 11px; color: var(--text-hint); }

      .field-error input,
      .field-error select { border-color: #C0392B; }
      .field-error .pill-option label { border-color: #C0392B; }
      .error-msg { font-size: 12px; color: #C0392B; margin-top: 5px; display: none; }
      .field-error .error-msg { display: block; }

      .submit-btn {
        width: 100%;
        padding: 15px;
        background: var(--brand);
        color: #fff;
        border: none;
        border-radius: var(--radius);
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
        letter-spacing: .01em;
        transition: background .15s;
        margin-top: .5rem;
      }
      .submit-btn:hover:not(:disabled) { background: var(--brand-mid); }
      .submit-btn:active { transform: scale(.99); }
      .submit-btn:disabled { opacity: 0.65; cursor: not-allowed; }

      .form-note {
        font-size: 12px;
        color: var(--text-hint);
        text-align: center;
        margin-top: 12px;
        line-height: 1.5;
      }

      .success-screen {
        text-align: center;
        padding: 5rem 2rem;
      }
      .success-icon {
        width: 56px; height: 56px;
        border-radius: 50%;
        background: var(--brand-light);
        margin: 0 auto 1.5rem;
        display: flex; align-items: center; justify-content: center;
        color: var(--brand);
      }
      .success-screen h2 { font-size: 22px; font-weight: 600; color: var(--brand); margin-bottom: 10px; }
      .success-screen p { font-size: 14px; color: var(--text-secondary); line-height: 1.7; max-width: 380px; margin: 0 auto; }

      @media (max-width: 480px) {
        .row-2 { grid-template-columns: 1fr; }
        .scale-btn { height: 44px; font-size: 14px; }
        .form-header h1 { font-size: 22px; }
      }
    `}</style>
  )
}
