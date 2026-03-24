import React from 'react'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'

export default function LanguageSwitcher({ className = '' }) {
  const { i18n, t } = useTranslation()

  const languages = [
    { code: 'es', name: '🇪🇸 Español' },
    { code: 'en', name: '🇺🇸 English' },
    { code: 'ko', name: '🇰🇷 한국어' }
  ]

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={() => {
          const menu = document.getElementById('language-menu')
          if (menu) menu.classList.toggle('hidden')
        }}
        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-3 py-2 rounded-lg font-medium transition-all shadow-lg hover:shadow-xl text-sm"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">{i18n.language.toUpperCase()}</span>
      </button>
      
      <div
        id="language-menu"
        className="hidden absolute top-12 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50"
      >
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => {
              i18n.changeLanguage(lang.code)
              document.getElementById('language-menu')?.classList.add('hidden')
            }}
            className={`block w-full text-left px-4 py-2 transition-colors ${
              i18n.language === lang.code
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-200 hover:bg-slate-700'
            }`}
          >
            {lang.name}
          </button>
        ))}
      </div>
    </div>
  )
}

