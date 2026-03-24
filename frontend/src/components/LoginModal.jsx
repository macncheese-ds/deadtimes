import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { login } from '../api_deadtimes'

export default function LoginModal({ visible, defaultEmployee = '', onClose, onConfirm, busy }) {
  const { t } = useTranslation()
  const [employeeInput, setEmployeeInput] = useState(defaultEmployee)
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState(null)
  const employeeInputRef = useRef(null)

  // Reiniciar todo cuando el modal se abre
  useEffect(() => {
    if (visible) {
      setEmployeeInput(defaultEmployee)
      setPassword('')
      setStatus(null)
      // Focus en el campo de empleado al abrir
      setTimeout(() => {
        if (employeeInputRef.current) {
          employeeInputRef.current.focus()
        }
      }, 100)
    }
  }, [visible, defaultEmployee])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus(null)
    
    if (!employeeInput.trim()) {
      setStatus(t('login.enterEmployee'))
      return
    }
    if (!password) {
      setStatus(t('login.enterPassword'))
      return
    }

    try {
      await onConfirm({ employee_input: employeeInput.trim(), password })
    } catch (err) {
      const msg = err && err.message ? err.message : t('login.invalidCredentials')
      setStatus(msg)
    }
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in">
      <div className="glass-card rounded-2xl p-8 w-full max-w-sm shadow-2xl border border-slate-700/50 animate-slide-up">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white">{t('login.loginButton')}</h3>
          <p className="text-sm text-slate-400 mt-1">{t('login.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm text-slate-300 mb-2 font-medium">{t('login.employeeLabel')}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                </svg>
              </div>
              <input
                ref={employeeInputRef}
                type="text"
                className="w-full bg-slate-800/50 border border-slate-600/50 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-500 transition-all"
                value={employeeInput}
                onChange={(e) => setEmployeeInput(e.target.value)}
                placeholder={t('login.employeePlaceholder')}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm text-slate-300 mb-2 font-medium">{t('login.passwordLabel')}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                type="password"
                className="w-full bg-slate-800/50 border border-slate-600/50 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-500 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login.passwordPlaceholder')}
                autoComplete="current-password"
              />
            </div>
          </div>

          {status && (
            <div className="flex items-center gap-2 text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 p-4 rounded-xl mb-4">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{status}</span>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 px-4 py-3 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 font-medium transition-all border border-slate-600/50"
            >
              {t('common.cancel')}
            </button>
            <button 
              type="submit" 
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 flex items-center justify-center gap-2"
              disabled={busy}
            >
              {busy ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{t('login.verifying')}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <span>{t('login.loginButton')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
