'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { apiGet } from '@/lib/api'
import Logomark from '@/components/brand/Logomark'
import BetaFeedbackStage2 from '@/components/beta-feedback/BetaFeedbackStage2'
import type { FollowUpContext } from '@/components/beta-feedback/content'

export default function BetaFeedbackPage() {
  const { id } = useParams<{ id: string }>()
  const locale = useLocale() as 'en' | 'ar'
  const t = useTranslations('results')
  const riasecLabel = (type: string) => t.has(`riasecTypes.${type}`) ? t(`riasecTypes.${type}` as any) : type

  const [topType, setTopType] = useState<string | null>(null)
  const [context, setContext] = useState<FollowUpContext | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiGet<any>(`/beta-feedback/${id}/riasec-summary`)
      .then(data => setTopType(data.top_type || ''))   // '' = loaded but no type, so the page does not spin forever
      .catch(err => setError(err.message || 'Could not load this response.'))
    // Decides which follow-up the reader gets: free (7 + 2) or paid (12), plus the conditional questions.
    apiGet<any>(`/beta-feedback/${id}/context`)
      .then(data => setContext({
        planTier: data.plan_tier === 'paid' ? 'paid' : 'free',
        reportLocale: data.report_locale === 'ar' ? 'ar' : 'en',
        openedAiImpact: !!data.opened_ai_impact,
      }))
      .catch(err => setError(err.message || 'Could not load this response.'))
  }, [id])

  if (error) {
    return (
      <div className="min-h-screen brand-surface flex items-center justify-center px-4">
        <p className="text-rose-500 text-sm">{error}</p>
      </div>
    )
  }

  if (topType === null || !context) {
    return (
      <div className="min-h-screen brand-hero flex items-center justify-center px-6">
        <Logomark size={44} tone="dark" glow />
      </div>
    )
  }

  return (
    <div className="min-h-screen brand-surface px-4 py-10 max-w-xl mx-auto" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <BetaFeedbackStage2
        responseId={id}
        locale={locale}
        context={context}
        personalityTypeLabel={topType ? riasecLabel(topType) : ''}
      />
    </div>
  )
}
