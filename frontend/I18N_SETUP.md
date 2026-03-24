# Deadtimes Frontend - Complete i18n Setup

## Overview
A complete English-Spanish-Korean translation system has been implemented with **Spanish as the default language**.

## Files Created

### Translation Files
- **`src/locales/es.json`** - Spanish translations (Default)
- **`src/locales/en.json`** - English translations  
- **`src/locales/ko.json`** - Korean translations

### Configuration Files
- **`src/i18n.js`** - i18n configuration with Spanish as fallback language
- **`src/components/LanguageSwitcher.jsx`** - Language switcher component

### Updated Files
- **`src/main.jsx`** - Added i18n import to initialize translations
- **`src/pages/Login.jsx`** - Updated to use i18n translations
- **`src/components/LoginModal.jsx`** - Updated to use i18n translations

## How to Use Translations

### In Components
```jsx
import { useTranslation } from 'react-i18next'

export default function MyComponent() {
  const { t } = useTranslation()
  
  return (
    <h1>{t('common.title')}</h1>
    <button>{t('common.save')}</button>
  )
}
```

### Adding Language Switcher
Add the language switcher to your layout:
```jsx
import LanguageSwitcher from './components/LanguageSwitcher'

// In your JSX:
<LanguageSwitcher />
```

## Current Translation Coverage

### Sections Included
- **common** - Common UI elements (Cancel, Confirm, Save, Delete, etc.)
- **login** - Login page strings
- **nav** - Navigation menu items
- **tickets** - Ticket management strings
- **stats** - Analytics and statistics labels
- **configuration** - Configuration panel strings
- **display** - Display/visualization strings
- **maintenance** - Maintenance control strings
- **modelChange** - Model change control strings
- **audit** - Audit control strings
- **produccion** - Production section strings
- **messages** - General messaging strings
- **languages** - Language names in all three languages

## Language Persistence

Languages are automatically saved to localStorage. When users return to the app, their language preference is restored.

## Default Language
- **Spanish (es)** is set as the default language
- If a translation key is missing, Spanish fallback will be used

## Next Steps to Complete Integration

To translate all remaining strings in Home.jsx and other components:

1. Replace hardcoded Spanish strings with translation keys
2. Use the pattern: `t('section.key')`
3. Add any new translation keys to all three locales files

### Example Home.jsx Updates
```jsx
// Before
<h1>Tiempos de Atención</h1>

// After  
<h1>{t('stats.responseTime')}</h1>
```

## Dependencies
- **i18next** - ^23.x (Language framework)
- **react-i18next** - ^13.x (React integration)

Both are already installed in package.json

## File Locations
```
deadtimes/frontend/
├── src/
│   ├── i18n.js
│   ├── main.jsx
│   ├── locales/
│   │   ├── es.json
│   │   ├── en.json
│   │   └── ko.json
│   ├── components/
│   │   ├── LoginModal.jsx (UPDATED)
│   │   └── LanguageSwitcher.jsx (NEW)
│   └── pages/
│       └── Login.jsx (UPDATED)
```

## Test the Setup
```bash
npm run dev
# Go to login page and use the language switcher in the top-right corner
# Try switching between Spanish, English, and Korean
```
