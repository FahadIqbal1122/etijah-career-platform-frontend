'use client'

import { useCallback, useEffect, useState } from 'react'
import RichTextEditor from '@/components/RichTextEditor'

type EmailTemplate = {
  id: string
  key: string
  name: string
  description: string | null
  is_active: boolean
  subject_en: string
  subject_ar: string
  body_html_en: string
  body_html_ar: string
  variables: string[]
}

export default function EmailTemplatesTab() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [locale, setLocale] = useState<'en' | 'ar'>('en')
  const [form, setForm] = useState<Partial<EmailTemplate>>({})
  const [saving, setSaving] = useState(false)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/email-templates')
      if (!res.ok) throw new Error('Failed to load email templates')
      setTemplates(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load email templates')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  function openEditor(t: EmailTemplate) {
    setEditingKey(t.key)
    setLocale('en')
    setForm({ ...t })
    setError('')
  }

  async function handleSave() {
    if (!editingKey) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/email-templates/${editingKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          is_active: form.is_active,
          subject_en: form.subject_en,
          subject_ar: form.subject_ar,
          body_html_en: form.body_html_en,
          body_html_ar: form.body_html_ar,
        }),
      })
      if (!res.ok) throw new Error('Failed to save template')
      const updated = await res.json()
      setTemplates(prev => prev.map(t => (t.key === updated.key ? updated : t)))
      setEditingKey(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const editing = templates.find(t => t.key === editingKey)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-400">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && !editing && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Key</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {templates.map((t, i) => (
                <tr key={t.key} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">{t.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{t.key}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {t.is_active ? 'Live' : 'Not wired yet'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">{t.description}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEditor(t)} className="text-xs text-violet-600 hover:text-violet-800 hover:underline font-semibold">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {templates.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">No email templates found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && editing && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Edit — {editing.name}</h2>
            <button onClick={() => setEditingKey(null)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
          </div>
          {editing.description && <p className="text-xs text-slate-400 mb-4">{editing.description}</p>}

          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="tmpl_active"
              checked={!!form.is_active}
              onChange={e => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
              className="w-4 h-4 accent-violet-600"
            />
            <label htmlFor="tmpl_active" className="text-sm text-slate-600">Active</label>
          </div>

          {(editing.variables?.length ?? 0) > 0 && (
            <p className="text-xs text-slate-400 mb-4">
              Available placeholders:{' '}
              {editing.variables.map(v => (
                <code key={v} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mr-1">{`{{${v}}}`}</code>
              ))}
            </p>
          )}

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setLocale('en')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${locale === 'en' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              English
            </button>
            <button
              onClick={() => setLocale('ar')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${locale === 'ar' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              Arabic
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Subject ({locale === 'en' ? 'English' : 'Arabic'})</label>
              <input
                type="text"
                dir={locale === 'ar' ? 'rtl' : 'ltr'}
                value={(locale === 'en' ? form.subject_en : form.subject_ar) || ''}
                onChange={e => setForm(prev => ({ ...prev, [locale === 'en' ? 'subject_en' : 'subject_ar']: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Body ({locale === 'en' ? 'English' : 'Arabic'})</label>
              <RichTextEditor
                key={`${editingKey}-${locale}`}
                value={(locale === 'en' ? form.body_html_en : form.body_html_ar) || ''}
                onChange={html => setForm(prev => ({ ...prev, [locale === 'en' ? 'body_html_en' : 'body_html_ar']: html }))}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
            >
              {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
