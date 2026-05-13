'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { apiGet } from '@/lib/api'
import { CopyLinkButton } from '@/components/CopyLinkButton'

const levelToWidth: Record<string, string> = {
  low: '20%',
  'low-moderate': '38%',
  moderate: '52%',
  'moderate-high': '68%',
  high: '88%',
}

export default function ResultsPage() {
    const params = useParams()
    const id = params.id as string

    const [summary, setSummary] = useState<any>(null)
    const [error, setError] = useState('')

    useEffect(() => {
        apiGet<any>(`/assessment/${id}/results`)
            .then(data => setSummary(data.summary))
            .catch(err => setError(err.message || 'Failed to load results'))
    }, [id])

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
                <p className="text-red-500 text-sm">{error}</p>
            </div>
        )
    }

    if (!summary) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center space-y-3">
                    <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-slate-400 text-sm">Loading your results…</p>
                </div>
            </div>
        )
    }

    const topType = summary.riasec.top_types[0]

    return (
        <div className="min-h-screen bg-slate-50">

            {/* ── Hero ── */}
            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-4 pt-10 pb-20 text-center text-white">
                <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-3">Career Assessment Results</p>
                <h1 className="text-3xl font-bold mb-2">Your Career Profile</h1>
                <p className="text-blue-200 text-sm mb-6 max-w-xs mx-auto">Here's a personalised breakdown based on your responses</p>
                <span className="inline-block bg-white/15 border border-white/25 backdrop-blur-sm text-white px-5 py-2 rounded-full text-sm font-semibold capitalize">
                    Primary type: {topType}
                </span>
            </div>

            {/* ── Content ── */}
            <div className="max-w-2xl mx-auto px-4 -mt-8 pb-16 space-y-4">

                {/* Share row */}
                <div className="flex justify-end">
                    <CopyLinkButton />
                </div>

                {/* Career Types */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.07A2.25 2.25 0 0118 20.47H6a2.25 2.25 0 01-2.25-2.25v-4.07M15.75 9.75V6a3.75 3.75 0 00-7.5 0v3.75M3.75 9.75h16.5" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800 text-base">Career Types</h3>
                            <p className="text-xs text-slate-400">Your RIASEC personality profile</p>
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {summary.riasec.top_types.map((t: string, i: number) => (
                            <span
                                key={t}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize ${
                                    i === 0
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-blue-50 text-blue-700 border border-blue-100'
                                }`}
                            >
                                {t}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Values */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800 text-base">Core Values</h3>
                            <p className="text-xs text-slate-400">What drives your decisions</p>
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {summary.values.top_values.map((v: string, i: number) => (
                            <span
                                key={v}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize ${
                                    i === 0
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                                }`}
                            >
                                {v}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Strengths */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800 text-base">Top Strengths</h3>
                            <p className="text-xs text-slate-400">Your natural advantages</p>
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {summary.strengths.top_strengths.map((s: string, i: number) => (
                            <span
                                key={s}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize ${
                                    i === 0
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-purple-50 text-purple-700 border border-purple-100'
                                }`}
                            >
                                {s}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Big Five Personality */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800 text-base">Personality</h3>
                            <p className="text-xs text-slate-400">Big Five trait profile</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {Object.entries(summary.big_five).map(([trait, level]: any) => (
                            <div key={trait}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-slate-700 capitalize">{trait.replace(/_/g, ' ')}</span>
                                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full capitalize">{level}</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                    <div
                                        className="bg-indigo-500 h-2 rounded-full transition-all duration-700"
                                        style={{ width: levelToWidth[level] ?? '50%' }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    )
}
