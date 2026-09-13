'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiAuthGet, apiAuthPost } from '@/lib/api'
import {
  personalHook, stage2CoCreator, stage2Hook, stage2ProgressCarry, stage2Reward, stage2Sections,
  type Locale,
} from './content'
import { FaceScale, MultiPillSelect, PillSelect, Scale6, TextField } from './shared'

type Answers = Record<string, any>

export default function BetaFeedbackStage2({ responseId, locale, stage1AnsweredCount, personalityTypeLabel }: {
  responseId: string
  locale: Locale
  stage1AnsweredCount: number
  personalityTypeLabel: string
}) {
  const [answers, setAnswers] = useState<Answers>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  // Pre-fill with any previously submitted answers so revisiting this link
  // (e.g. from a re-notify email) lets someone edit instead of starting over.
  useEffect(() => {
    apiAuthGet<Answers>(`/beta-feedback/${responseId}/stage2`)
      .then(existing => {
        if (Object.keys(existing).length) setAnswers(existing)
      })
      .catch(() => {})
  }, [responseId])

  const visibleSections = useMemo(
    () => stage2Sections.map(s => ({ ...s, fields: s.fields.filter(f => !f.showIf || f.showIf(answers)) })),
    [answers]
  )

  function set(key: string, value: any) {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }

  function missingRequired(): boolean {
    for (const section of visibleSections) {
      for (const field of section.fields) {
        if (!field.required) continue
        const value = answers[field.key]
        const empty = Array.isArray(value) ? value.length === 0 : (value === undefined || value === '')
        if (empty) return true
      }
    }
    return false
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (missingRequired()) {
      setError(locale === 'ar' ? 'يرجى تعبئة جميع الحقول المطلوبة.' : 'Please fill in all required fields.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      // device/language_used are no longer asked as questions (per the beta-
      // strategy doc — capture automatically instead) but the admin dashboard
      // still reads these columns, so they're detected here rather than
      // dropped outright.
      const device = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
      await apiAuthPost('/beta-feedback/stage2', {
        response_id: responseId, locale, device, language_used: locale, ...answers,
      })
      setSubmitted(true)
    } catch {
      setError(locale === 'ar' ? 'حدث خطأ ما. يرجى المحاولة مرة أخرى.' : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="card p-6 text-center mt-4" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        <p className="text-sm font-semibold text-charcoal mb-1">
          {locale === 'ar' ? 'شكرًا لك!' : 'Thank you!'}
        </p>
        <p className="text-xs text-charcoal/50 mb-4">{stage2Reward[locale]}</p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="text-xs font-semibold text-primary hover:underline"
        >
          {locale === 'ar' ? 'تعديل إجاباتك' : 'Edit your answers'}
        </button>
      </div>
    )
  }

  return (
    <div className="card p-6 mt-4" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="mb-6 text-center">
        <p className="text-sm font-semibold text-charcoal mb-1.5">{stage2Hook[locale]}</p>
        {stage1AnsweredCount > 0 && (
          <p className="text-xs text-teal font-medium">
            {locale === 'ar'
              ? `سجّلنا ${stage1AnsweredCount === 1 ? 'إجابة سريعة' : `${stage1AnsweredCount} إجابات سريعة`} منك بالفعل — بقي نموذج قصير واحد فقط.`
              : stage2ProgressCarry.en}
          </p>
        )}
        <p className="text-xs text-charcoal/50 mt-2">{personalHook(personalityTypeLabel, locale)}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {visibleSections.map(section => (
          <section key={section.id}>
            <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 pb-2 border-b border-slate-200 mb-5">
              {section.heading[locale]}
            </p>
            {section.fields.map(field => {
              const value = answers[field.key]
              const note = field.note?.[locale]
              switch (field.type) {
                case 'face5':
                  return (
                    <FaceScale
                      key={field.key} label={field.label[locale]} note={note} required={field.required} locale={locale}
                      value={value} onChange={v => set(field.key, v)}
                    />
                  )
                case 'scale6':
                  return (
                    <Scale6
                      key={field.key} label={field.label[locale]} note={note} required={field.required}
                      low={field.low?.[locale] || ''} high={field.high?.[locale] || ''}
                      value={value} onChange={v => set(field.key, v)}
                    />
                  )
                case 'single':
                  return (
                    <PillSelect
                      key={field.key} label={field.label[locale]} note={note} required={field.required}
                      options={field.options || []} value={value} locale={locale}
                      onChange={v => set(field.key, v)}
                    />
                  )
                case 'multi':
                  return (
                    <MultiPillSelect
                      key={field.key} label={field.label[locale]} required={field.required} options={field.options || []}
                      value={value || []} locale={locale}
                      onChange={v => set(field.key, v)}
                    />
                  )
                case 'text':
                  return (
                    <TextField
                      key={field.key} label={field.label[locale]}
                      value={value || ''} onChange={v => set(field.key, v)}
                    />
                  )
                default:
                  return null
              }
            })}
          </section>
        ))}

        <p className="text-xs text-charcoal/50 text-center leading-relaxed">{stage2CoCreator[locale]}</p>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 bg-primary hover:bg-primary-deep disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors"
        >
          {submitting ? (locale === 'ar' ? 'جارٍ الإرسال…' : 'Submitting…') : (locale === 'ar' ? 'إرسال التقييم' : 'Submit feedback')}
        </button>
      </form>
    </div>
  )
}
