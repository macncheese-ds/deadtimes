import React from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')).render(<App />)

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('[PWA] Service Worker registered, scope:', reg.scope))
      .catch((err) => console.warn('[PWA] Service Worker registration failed:', err))
  })
}
