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
            locale === 'en' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          EN
        </button>
        <button
          onClick={() => switchLocale('ar')}
          className={`px-3 py-1 text-sm rounded transition-all ${
            locale === 'ar' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          عربي
        </button>
      </div>
    )
  }