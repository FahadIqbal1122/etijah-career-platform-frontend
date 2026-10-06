'use client'

// Inline link that brings Sarah back after someone pressed her cross. Deliberately not a floating button:
// a round button in a bottom corner reads as customer service.
export default function CoachSummon({ locale, onShow, className = '' }: { locale: 'en' | 'ar'; onShow: () => void; className?: string }) {
  return (
    <button type="button" onClick={onShow} className={`underline ${className}`}>
      {locale === 'ar' ? 'أرجع سارة' : 'Bring Sarah back'}
    </button>
  )
}
