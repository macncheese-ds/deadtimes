import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import esTranslations from './locales/es.json'
import enTranslations from './locales/en.json'
import koTranslations from './locales/ko.json'

const resources = {
  es: { translation: esTranslations },
  en: { translation: enTranslations },
  ko: { translation: koTranslations }
}

// Get saved language from localStorage or default to Spanish
const savedLanguage = localStorage.getItem('language') || 'es'

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false
    }
  })

// Save language preference when it changes
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng)
})

export default i18n
