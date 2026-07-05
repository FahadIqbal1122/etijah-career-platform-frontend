  'use client'

  import { useLocale } from 'next-intl'
  import { useRouter, usePathname } from '@/i18n/navigation'

  export default function LanguageSwitcher() {
    const locale = useLocale()
    const router = useRouter()                                                                                                                                                    
    const pathname = usePathname()

    function switchLocale(next: string) {
      router.replace(pathname, { locale: next })
    }
  
    return (
      <div className="flex gap-1">
        <button
          onClick={() => switchLocale('en')}
          className={`px-3 py-1 text-sm rounded transition-all ${
            locale === 'en' ? 'bg-primary text-white' : 'text-charcoal/60 hover:text-primary'
          }`}
        >
          EN
        </button>
        <button
          onClick={() => switchLocale('ar')}
          className={`px-3 py-1 text-sm rounded transition-all ${
            locale === 'ar' ? 'bg-primary text-white' : 'text-charcoal/60 hover:text-primary'
          }`}
        >
          عربي
        </button>
      </div>
    )
  }