'use client'

import { useTranslations } from 'next-intl'
import {useState} from 'react'
import {questions, BEHAVIORAL_SCALE, Question} from '@/data/questions'
import {supabase} from '@/lib/supabase'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import { apiPost } from '@/lib/api'

//Group questions by section
const sections = questions.reduce((acc, question) =>{
    if (!acc[question.section]) acc[question.section] = []
    acc[question.section].push(question)
    return acc
}, {} as Record<string, Question[]>)

const sectionNames = Object.keys(sections)

export default function AssessmentForm() {
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, any>>({})
    const [submitted, setSubmitted] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [summary, setSummary] = useState<any>(null)
    const [error, setError] = useState('')

    const tForm = useTranslations('form')
    const tSections = useTranslations('sections')
    const tQ = useTranslations('questions')
    const tScale = useTranslations('scale')

    const currentSection = sectionNames[currentSectionIndex]
    const currentQuestions = sections[currentSection]
    const isLastSection = currentSectionIndex === sectionNames.length - 1
    const progress = ((currentSectionIndex) / sectionNames.length) * 100

    // Check all questions in current section are answered
    const currentSectionComplete = currentQuestions.every(q =>{
        const answer = answers[q.id]
        if (answer === undefined || answer === null || answer === '') return false
        if (Array.isArray(answer)) return answer.length > 0
        return true
    })

    function handleSingleSelect(questionId: string, value: string){
        setAnswers(prev => ({...prev, [questionId]: value}))
    }

    function handleMultiSelect(questionId: string, value: string, maxSelect?: number){
    setAnswers(prev => {
        const current: string[] = prev[questionId] || []
        const exists = current.includes(value)
        if(exists){
            return { ...prev, [questionId]: current.filter(v => v !== value)}
        } else {
            if (maxSelect && current.length >= maxSelect) return prev
            return { ...prev, [questionId]: [...current, value]}
        }
    })
}

    function handleScale(questionId: string, value: number){
        setAnswers(prev => ({...prev, [questionId]: value}))
    }

    function handleNext(){
        setCurrentSectionIndex(prev => prev + 1)
        window.scrollTo(0,0)
    }

    async function handleSubmit(){
        setSubmitting(true)
        setError('')
        console.log('handleSubmit called')

        try{
            console.log('before rpc')
            const { data, error } = await supabase.rpc('insert_assessment_response', {
                payload: {
                    full_name: answers['QD1'],
                    email: answers['QD2'],
                    phone: answers['QD3'],
                    country: answers['QO1'],
                    nationality: answers['QO2'],
                    age_bracket: answers['QO3'],
                    current_stage: answers['QO4'],
                    education_field: answers['QO5'],
                    sectors_of_interest: answers['QO6'] || [],
                    career_structure: answers['QO7'],
                    languages: answers['QO8'] || [],
                    geographic_openness: answers['QO9'],
                    why_here: answers['QO10'],
                    answers: answers,
                    completed: true,
                }
            })
            console.log('RPC data:', data)
            console.log('RPC error:', error)
            if (error) throw error
            const result = await apiPost<any>(`/assessment/${data}/score`, {})
            setSummary(result.summary)
            setSubmitted(true)
        } catch (err: any) {
            console.error('Submission error:', err)
            setError(err?.message || tForm('error'))
        } finally {
            setSubmitting(false)
        }
    }

    // ─── SUBMITTED STATE ──────────────────────────────────
    if (submitted && summary) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
                <h2 className="text-2xl font-bold text-gray-800">Your Results</h2>

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

  // ─── MAIN FORM ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Progress bar */}
      <div className="fixed top-14 left-0 right-0 z-10 bg-gray-50 border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-2">
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span>{tSections(currentSection)}</span>
            <span>{tForm('ofTotal', { current: currentSectionIndex + 1, total: sectionNames.length })}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div
              className="bg-blue-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="max-w-2xl mx-auto px-4 pt-36 pb-32">
        <div className="space-y-10">
          {currentQuestions.map((question) => (
            <div key={question.id} className="bg-white rounded-xl p-6 shadow-sm">

              {/* Question text */}
              <p className="text-gray-800 font-medium mb-4 leading-relaxed">
                {tQ(`${question.id}.text`)}
              </p>

              {/* ── Text / Email / Phone Input ── */}
              {(question.type === 'text_input' || question.type === 'email_input') && (
                <input
                  type={question.type === 'email_input' ? 'email' : 'text'}
                  value={answers[question.id] || ''}
                  onChange={e => handleSingleSelect(question.id, e.target.value)}
                  placeholder={tForm('placeholder')}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:outline-none text-gray-800"
                />
              )}
              {/* phone gets its own block with PhoneInput */}
              {question.type === 'phone_input' && (
                <PhoneInput
                  country={'bh'}
                  value={answers[question.id] || ''}
                  onChange={val => handleSingleSelect(question.id, val)}
                  containerClass="!w-full"
                  inputClass="!w-full !h-12 !rounded-lg !border !border-gray-200 !text-gray-800 !text-base"
                  buttonClass="!rounded-l-lg !border !border-gray-200 !bg-white"
                />
              )}

              {/* ── Behavioral Scale ── */}
              {question.type === 'behavioral_scale' && (
                <div className="space-y-2">
                  {BEHAVIORAL_SCALE.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleScale(question.id, option.value)}
                      className={`w-full text-start px-4 py-3 rounded-lg border transition-all ${
                        answers[question.id] === option.value
                          ? 'border-blue-600 bg-blue-50 text-blue-800 font-medium'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <span className="text-gray-400 text-sm me-2">{option.value}</span>
                      {tScale(String(option.value))}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Forced Choice ── */}
              {question.type === 'forced_choice' && (
                <div className="space-y-3">
                  {question.options?.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleSingleSelect(question.id, option.value)}
                      className={`w-full text-start px-4 py-4 rounded-lg border transition-all ${
                        answers[question.id] === option.value
                          ? 'border-blue-600 bg-blue-50 text-blue-800 font-medium'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <span className="font-bold me-2">{option.value})</span>
                      {tQ(`${question.id}.options.${option.value}`)}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Single Select ── */}
              {question.type === 'single_select' && (
                <div className="space-y-2">
                  {question.options?.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleSingleSelect(question.id, option.value)}
                      className={`w-full text-start px-4 py-3 rounded-lg border transition-all ${
                        answers[question.id] === option.value
                          ? 'border-blue-600 bg-blue-50 text-blue-800 font-medium'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      {tQ(`${question.id}.options.${option.value}`)}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Multi Select ── */}
              {question.type === 'multi_select' && (
                <div>
                  {question.maxSelect && (
                    <p className="text-sm text-gray-400 mb-3">
                      {tForm('selectUpTo', { max: question.maxSelect })}
                    </p>
                  )}
                  <div className="space-y-2">
                    {question.options?.map((option) => {
                      const selected: string[] = answers[question.id] || []
                      const isSelected = selected.includes(option.value)
                      return (
                        <button
                          key={option.value}
                          onClick={() => handleMultiSelect(question.id, option.value, question.maxSelect)}
                          className={`w-full text-start px-4 py-3 rounded-lg border transition-all ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50 text-blue-800 font-medium'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          <span className="mr-2">{isSelected ? '☑' : '☐'}</span>
                          {tQ(`${question.id}.options.${option.value}`)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

            </div>
          ))}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm shadow-[0_-2px_12px_rgba(0,0,0,0.06)] p-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">

          {/* Back button */}
          {currentSectionIndex > 0 && (
            <button
              onClick={() => {
                setCurrentSectionIndex(prev => prev - 1)
                window.scrollTo(0, 0)
              }}
              className="px-6 py-2 text-gray-600 hover:text-gray-800"
            >
              {tForm('back')}
            </button>
          )}
          <div />

          {/* Next / Submit button */}
          {isLastSection ? (
            <button
              onClick={handleSubmit}
              disabled={!currentSectionComplete || submitting}
              className={`px-8 py-3 rounded-xl font-medium transition-all ${
                currentSectionComplete && !submitting
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {submitting ? tForm('submitting') : tForm('submit')}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!currentSectionComplete}
              className={`px-8 py-3 rounded-xl font-medium transition-all ${
                currentSectionComplete
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {tForm('next')}
            </button>
          )}

        </div>

        {error && (
          <p className="text-center text-red-500 text-sm mt-2">{error}</p>
        )}
      </div>

    </div>
  )
}
