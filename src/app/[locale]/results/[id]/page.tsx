'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { apiGet } from '@/lib/api'
import { CopyLinkButton } from '@/components/CopyLinkButton'

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
            <div className="max-w-2xl mx-auto px-4 py-12 text-center text-red-500">
                {error}
            </div>
        )
    }

    if (!summary) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-12 text-center text-gray-400">
                Loading results...
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Your Results</h2>
                <CopyLinkButton />
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-700 mb-3">Top Career Types</h3>
                <div className="flex gap-2 flex-wrap">
                    {summary.riasec.top_types.map((t: string) => (
                        <span key={t} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm capitalize">{t}</span>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-700 mb-3">Top Values</h3>
                <div className="flex gap-2 flex-wrap">
                    {summary.values.top_values.map((v: string) => (
                        <span key={v} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm capitalize">{v}</span>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-700 mb-3">Top Strengths</h3>
                <div className="flex gap-2 flex-wrap">
                    {summary.strengths.top_strengths.map((s: string) => (
                        <span key={s} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm capitalize">{s}</span>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-700 mb-3">Personality</h3>
                <div className="space-y-2">
                    {Object.entries(summary.big_five).map(([trait, level]: any) => (
                        <div key={trait} className="flex justify-between text-sm">
                            <span className="text-gray-600 capitalize">{trait.replace('_', ' ')}</span>
                            <span className="font-medium text-gray-800 capitalize">{level}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
