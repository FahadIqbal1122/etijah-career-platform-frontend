'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { supabase } from '@/lib/supabase'
import Logomark from '@/components/brand/Logomark'

const field =
  'w-full border border-[var(--line-strong)] rounded-xl px-3.5 py-2.5 text-sm bg-lightblue text-charcoal placeholder-charcoal/40 focus:outline-none focus:border-accent focus:ring-2 focus:ring-teal/20 transition-colors'

export default function ResetPasswordPage() {
  const router = useRouter()
  const locale = useLocale()
  const [ready, setReady] = useState(false)
  const [expired, setExpired] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  // The emailed link carries a recovery token; supabase-js picks it up from the URL and
  // fires PASSWORD_RECOVERY, which gives a temporary session allowed to change the password.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) setReady(true)
      else setExpired(true)
    }, 1500)
    return () => {
      sub.subscription.unsubscribe()
      clearTimeout(t)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setDone(true)
    setTimeout(() => router.push(`/${locale}/dashboard`), 1500)
  }

  return (
    <div className="min-h-screen brand-surface flex items-center justify-center px-4">
      <div className="card p-8 w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <Logomark size={34} />
          <div>
            <h1 className="text-xl font-extrabold text-charcoal leading-none">Set new password</h1>
            <p className="text-xs text-charcoal/40 mt-1">Etijahi · إتجاهي</p>
          </div>
        </div>
        {done ? (
          <p className="text-sm text-charcoal/70">Password updated. Taking you to your dashboard…</p>
        ) : ready ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal/70 mb-1">New password</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={field}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal/70 mb-1">Confirm password</label>
              <input
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className={field}
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-rose-500 text-sm">{error}</p>}
            <button
              type="submit"
              data-track="reset_password_submit"
              disabled={loading}
              className="cta w-full"
              style={{ width: '100%', padding: '12px', fontSize: 14, borderRadius: 12 }}
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Saving…' : 'Update password'}
            </button>
          </form>
        ) : expired ? (
          <div className="space-y-4">
            <p className="text-sm text-charcoal/70">This reset link is invalid or has expired.</p>
            <a href={`/${locale}/forgot-password`} className="block text-center text-sm text-primary font-medium hover:underline">Request a new link</a>
          </div>
        ) : (
          <p className="text-sm text-charcoal/50">Verifying your link…</p>
        )}
      </div>
    </div>
  )
}
