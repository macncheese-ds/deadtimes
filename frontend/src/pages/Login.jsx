import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { login } from '../api_deadtimes'
import LoginModal from '../components/LoginModal'
import LanguageSwitcher from '../components/LanguageSwitcher'

export default function Login({ setUser }) {
  const { t } = useTranslation()
  const [showModal, setShowModal] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin({ employee_input, password }) {
    setBusy(true)
    setError('')
    try {
      const data = await login(employee_input, password)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)
    } catch (e) {
      setError(e.response?.data?.message || e.message || t('login.invalidCredentials'))
      throw e
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="bg-gray-800 text-gray-100 rounded-lg p-8 w-full max-w-md shadow-2xl border border-gray-700">
        <h1 className="text-3xl font-bold mb-2 text-center">{t('login.title')}</h1>
        <p className="text-gray-400 text-center mb-6">{t('login.subtitle')}</p>
        
        <button 
          onClick={() => setShowModal(true)}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-colors"
        >
          {t('login.scanBadge')}
        </button>

        {error && (
          <div className="mt-4 text-sm text-red-400 bg-red-900/20 p-3 rounded">
            {error}
          </div>
        )}

        <LoginModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          onConfirm={handleLogin}
          busy={busy}
        />
      </div>
    </div>
  )
}