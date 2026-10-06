'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { supabase } from '@/lib/supabase'
import Logomark from '@/components/brand/Logomark'

const field =
  'w-full border border-[var(--line-strong)] rounded-xl px-3.5 py-2.5 text-sm bg-lightblue text-charcoal placeholder-charcoal/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-teal/20 transition-colors'

export default function ForgotPasswordPage() {
  const locale = useLocale()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    // Hardcoded domain, same reasoning as signup's emailRedirectTo. Must be listed under
    // Supabase → Authentication → URL Configuration → Redirect URLs.
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `https://myetijahi.com/${locale}/reset-password`,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    // Same message whether or not the account exists, so this can't be used to probe emails.
    setSent(true)
  }

  return (
    <div className="min-h-screen brand-surface flex items-center justify-center px-4">
      <div className="card p-8 w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <Logomark size={34} />
          <div>
            <h1 className="text-xl font-extrabold text-charcoal leading-none">Reset password</h1>
            <p className="text-xs text-charcoal/40 mt-1">Etijahi · إتجاهي</p>
          </div>
        </div>
        {sent ? (
          <div className="space-y-4">
            <p className="text-sm text-charcoal/70 leading-relaxed">
              If an account exists for <span className="font-semibold">{email}</span>, we&apos;ve sent a link to reset your password. Check your inbox (and spam folder).
            </p>
            <a href={`/${locale}/login`} className="block text-center text-sm text-primary font-medium hover:underline">Back to sign in</a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-charcoal/60">Enter your email and we&apos;ll send you a link to set a new password.</p>
            <div>
              <label className="block text-sm font-medium text-charcoal/70 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={field}
                autoComplete="email"
              />
            </div>
            {error && <p className="text-rose-500 text-sm">{error}</p>}
            <button
              type="submit"
              data-track="forgot_password_submit"
              disabled={loading}
              className="cta w-full"
              style={{ width: '100%', padding: '12px', fontSize: 14, borderRadius: 12 }}
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <p className="text-center text-sm text-charcoal/40">
              <a href={`/${locale}/login`} className="text-primary font-medium hover:underline">Back to sign in</a>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
