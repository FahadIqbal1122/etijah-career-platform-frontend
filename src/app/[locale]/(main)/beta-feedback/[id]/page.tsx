'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { apiAuthGet } from '@/lib/api'
import Logomark from '@/components/brand/Logomark'
import BetaFeedbackStage1 from '@/components/beta-feedback/BetaFeedbackStage1'
import BetaFeedbackStage2 from '@/components/beta-feedback/BetaFeedbackStage2'

export default function BetaFeedbackPage() {
  const { id } = useParams<{ id: string }>()
  const locale = useLocale() as 'en' | 'ar'
  const t = useTranslations('results')
  const riasecLabel = (type: string) => t.has(`riasecTypes.${type}`) ? t(`riasecTypes.${type}` as any) : type

  const [topType, setTopType] = useState<string | null>(null)
  const [stage1Done, setStage1Done] = useState<boolean | null>(null)
  const [stage1AnsweredCount, setStage1AnsweredCount] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    apiAuthGet<any>(`/assessment/${id}/results`)
      .then(data => setTopType(data.summary?.riasec?.top_types?.[0] || null))
      .catch(err => setError(err.message || 'Could not load this response.'))
  }, [id])

  useEffect(() => {
    apiAuthGet<{ stage1_completed: boolean }>(`/beta-feedback/${id}/status`)
      .then(data => setStage1Done(!!data.stage1_completed))
      .catch(() => setStage1Done(false))
  }, [id])

  if (error) {
    return (
      <div className="min-h-screen brand-surface flex items-center justify-center px-4">
        <p className="text-rose-500 text-sm">{error}</p>
      </div>
    )
  }

  if (!topType || stage1Done === null) {
    return (
      <div className="min-h-screen brand-hero flex items-center justify-center px-6">
        <Logomark size={44} tone="dark" glow />
      </div>
    )
  }

  return (
    <div className="min-h-screen brand-surface px-4 py-10 max-w-xl mx-auto" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      {stage1Done ? (
        <BetaFeedbackStage2
          responseId={id}
          locale={locale}
          stage1AnsweredCount={stage1AnsweredCount}
          personalityTypeLabel={riasecLabel(topType)}
        />
      ) : (
        <BetaFeedbackStage1
          responseId={id}
          locale={locale}
          onAnswered={setStage1AnsweredCount}
          onComplete={() => setStage1Done(true)}
        />
      )}
    </div>
  )
}
