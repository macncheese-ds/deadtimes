# Quick Integration Guide for Remaining Components

## How to Integrate Translations into Home.jsx and Other Components

### Step 1: Import useTranslation Hook
At the top of your component file:
```jsx
import { useTranslation } from 'react-i18next'
```

### Step 2: Initialize in Component
Inside your component function:
```jsx
export default function Home() {
  const { t } = useTranslation()
  // ... rest of component
}
```

### Step 3: Replace Hardcoded Strings

#### Navigation Buttons
```jsx
// Before
<button>Nuevo Ticket</button>
<button>Abiertos</button>
<button>Cerrados</button>
<button>Producción</button>
<button>Herramientas</button>
<button>Configuración</button>
<button>Pantalla</button>
<button>Análisis</button>

// After
<button>{t('nav.newTicket')}</button>
<button>{t('nav.open')}</button>
<button>{t('nav.closed')}</button>
<button>{t('nav.produccion')}</button>
<button>{t('nav.tools')}</button>
<button>{t('nav.configuration')}</button>
<button>{t('nav.display')}</button>
<button>{t('nav.analytics')}</button>
```

#### Form Labels
```jsx
// Before
<label>Número de Empleado</label>
<label>Línea</label>
<label>Equipo</label>

// After
<label>{t('login.employeeLabel')}</label>
<label>{t('tickets.lineLabel')}</label>
<label>{t('tickets.equipmentLabel')}</label>
```

#### Stats Headers
```jsx
// Before
<div>
  <h3>Tiempos de Atención</h3>
  <p>Promedio últimos 30 días</p>
</div>

// After
<div>
  <h3>{t('stats.responseTime')}</h3>
  <p>{t('stats.lastDaysCount')}</p>
</div>
```

#### Messages and Notifications
```jsx
// Before
setError('Credenciales inválidas')
setSuccess('Ticket creado exitosamente')

// After
setError(t('login.invalidCredentials'))
setSuccess(t('tickets.ticketCreated'))
```

## Adding New Translation Keys

If you need additional strings not in the current translation files:

### 1. Add to es.json (Spanish - Default)
```json
{
  "section": {
    "newKey": "Texto en Español"
  }
}
```

### 2. Add to en.json (English)
```json
{
  "section": {
    "newKey": "Text in English"
  }
}
```

### 3. Add to ko.json (Korean)
```json
{
  "section": {
    "newKey": "한국어 텍스트"
  }
}
```

### 4. Use in Component
```jsx
<div>{t('section.newKey')}</div>
```

## Translation File Structure

The translation files are organized by sections for easy navigation:

```
{
  "common": { ... },           // Shared UI elements
  "login": { ... },            // Login page
  "nav": { ... },              // Navigation
  "tickets": { ... },          // Ticket management
  "stats": { ... },            // Analytics/statistics
  "configuration": { ... },    // Configuration panel
  "display": { ... },          // Display/visualization
  "maintenance": { ... },      // Maintenance controls
  "modelChange": { ... },      // Model changes
  "audit": { ... },            // Audit controls
  "produccion": { ... },       // Production section
  "messages": { ... },         // General messages
  "languages": { ... }         // Language names
}
```

## Language Switching Logic

The app automatically:
1. **Remembers user preference** - Saves to localStorage under 'language' key
2. **Defaults to Spanish** - If no preference saved, Spanish (es) is used
3. **Provides selector** - Use `<LanguageSwitcher />` component in your layout
4. **Re-renders on change** - React automatically updates all components using `t()`

## Common Patterns

### Conditional Messages
```jsx
const { t } = useTranslation()

return (
  <div>
    {isLoading ? (
      <p>{t('common.loading')}</p>
    ) : (
      <p>{t('stats.responseTime')}</p>
    )}
  </div>
)
```

### Button with Icon
```jsx
<button>
  <svg>...</svg>
  <span>{t('nav.newTicket')}</span>
</button>
```

### Dynamic Messages
```jsx
const getMessage = (isDone) => {
  return isDone ? t('tickets.ticketCreated') : t('common.loading')
}
```

### Numbers and Units
```jsx
// Use translation for units
<span>{value.toFixed(2)} {t('stats.hrs')}</span>
```

## Testing Translations

### In Dev Mode
```bash
npm run dev
```

1. Open browser DevTools
2. Go to Application > LocalStorage > http://localhost:5173
3. Look for 'language' key
4. Change it to 'en' or 'ko' and refresh
5. UI should update to selected language

### Language Switcher Location
The language switcher is already integrated in the Login page (top-right corner) as an example.

## Components Already Updated
✅ Login.jsx - Uses translations
✅ LoginModal.jsx - Uses translations
✅ LanguageSwitcher.jsx - Component for switching languages

## Components Needing Updates
- Home.jsx - Main dashboard (large file, many strings)
- Configuration.jsx - Config panel strings
- Display.jsx - Display/visualization strings
- HandleTicket.jsx - Ticket handling dialogs
- ViewTicket.jsx - Ticket view dialogs
- MachineAnalysis.jsx - Machine analysis strings
- Analytics.jsx - Analytics page strings
- ProduccionEdicion.jsx - Production editing
- ProduccionReview.jsx - Production review
- Other component files

## File Paths Reference
- Core i18n: `src/i18n.js`
- Translations: `src/locales/{es,en,ko}.json`
- Switcher: `src/components/LanguageSwitcher.jsx`
