  import LanguageSwitcher from './LanguageSwitcher'

  export default function Header() {
    return (
      <header className="fixed top-0 left-0 right-0 z-20 bg-white border-b border-gray-200 h-14 flex items-center px-6">
        <div className="max-w-2xl mx-auto w-full flex justify-between items-center">
          <span className="font-semibold text-gray-800">Etijah</span>                                                                                                                                    
          <LanguageSwitcher />                                                                                                                                                                                   </div>
      </header>
    )
  }