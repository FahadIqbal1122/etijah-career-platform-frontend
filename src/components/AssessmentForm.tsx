'use client'

import {useState} from 'react'
import {questions, BEHAVIORAL_SCALE, Question} from '@/data/questions'
import {supabase} from '@/lib/supabase'

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
    const [error, setError] = useState('')

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

        try{
            const {error} = await supabase.from('assessment_responses').insert({
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
            })
            if (error) throw error
            setSubmitted(true)
        } catch (err: any) {
            setError('Failed to submit assessment. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    // ─── SUBMITTED STATE ──────────────────────────────────
    if (submitted){
        return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Thank you!
          </h2>
          <p className="text-gray-600">
            Your responses have been saved. We will be in touch soon.
          </p>
        </div>
      </div>
    )
  }

  // ─── MAIN FORM ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>{currentSection}</span>
            <span>{currentSectionIndex + 1} of {sectionNames.length}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-32">
        <h2 className="text-xl font-bold text-gray-800 mb-8">
          {currentSection}
        </h2>

        <div className="space-y-10">
          {currentQuestions.map((question) => (
            <div key={question.id} className="bg-white rounded-xl p-6 shadow-sm">

              {/* Question text */}
              <p className="text-gray-800 font-medium mb-4 leading-relaxed">
                {question.text}
              </p>

              {/* ── Behavioral Scale ── */}
              {question.type === 'behavioral_scale' && (
                <div className="space-y-2">
                  {BEHAVIORAL_SCALE.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleScale(question.id, option.value)}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                        answers[question.id] === option.value
                          ? 'border-blue-600 bg-blue-50 text-blue-800 font-medium'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <span className="text-gray-400 text-sm mr-2">{option.value}</span>
                      {option.label}
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
                      className={`w-full text-left px-4 py-4 rounded-lg border transition-all ${
                        answers[question.id] === option.value
                          ? 'border-blue-600 bg-blue-50 text-blue-800 font-medium'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <span className="font-bold mr-2">{option.value})</span>
                      {option.label}
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
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                        answers[question.id] === option.value
                          ? 'border-blue-600 bg-blue-50 text-blue-800 font-medium'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Multi Select ── */}
              {question.type === 'multi_select' && (
                <div>
                  {question.maxSelect && (
                    <p className="text-sm text-gray-400 mb-3">
                      Select up to {question.maxSelect}
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
                          className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50 text-blue-800 font-medium'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          <span className="mr-2">{isSelected ? '☑' : '☐'}</span>
                          {option.label}
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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
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
              ← Back
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
              {submitting ? 'Submitting...' : 'Submit'}
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
              Next →
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
