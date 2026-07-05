'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { apiPost } from '@/lib/api'
import Logomark from '@/components/brand/Logomark'

const field =
  'w-full border border-[var(--line-strong)] rounded-xl px-3.5 py-2.5 text-sm bg-lightblue text-charcoal placeholder-charcoal/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-teal/20 transition-colors'

export default function SignupPage() {
  const searchParams = useSearchParams()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/en/dashboard` },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    if (data.user) {
      apiPost('/assessment/link-by-email', { user_id: data.user.id, email }).catch(() => {})
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen brand-surface flex items-center justify-center px-4">
        <div className="card p-8 w-full max-w-sm text-center">
          <div className="w-12 h-12 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-extrabold text-charcoal mb-2">Check your email</h1>
          <p className="text-sm text-charcoal/60">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
          </p>
          <a href="/en/login" className="inline-block mt-6 text-sm text-primary font-medium hover:underline">
            Back to sign in
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen brand-surface flex items-center justify-center px-4">
      <div className="card p-8 w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <Logomark size={34} />
          <div>
            <h1 className="text-xl font-extrabold text-charcoal leading-none">Create account</h1>
            <p className="text-xs text-charcoal/40 mt-1">Etijahi · إتجاهي</p>
          </div>
        </div>
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal/70 mb-1">Full name</label>
            <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className={field} autoComplete="name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal/70 mb-1">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={field} autoComplete="email" />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal/70 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={`${field} pe-10`}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-charcoal/40 hover:text-primary"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-charcoal/40 mt-1">Minimum 8 characters</p>
          </div>
          {error && <p className="text-rose-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="cta w-full"
            style={{ width: '100%', padding: '12px', fontSize: 14, borderRadius: 12 }}
          >
            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {loading ? 'Creating account…' : 'Create account'}
          </button>
          <p className="text-center text-sm text-charcoal/40">
            Already have an account?{' '}
            <a href="/en/login" className="text-primary font-medium hover:underline">Sign in</a>
          </p>
        </form>
      </div>
    </div>
  )
}
