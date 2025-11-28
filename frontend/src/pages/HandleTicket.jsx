import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getTicket, startTicket, updateTicket, finishTicket, login } from '../api_deadtimes'
import LoginModal from '../components/LoginModal'

export default function HandleTicket({ user, setUser }) {
  const { id } = useParams()
  const [ticket, setTicket] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [showCredentialsModal, setShowCredentialsModal] = useState(false)
  const [credentialsBusy, setCredentialsBusy] = useState(false)
  const [showLogoutWarning, setShowLogoutWarning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({ solucion: '', rate: '' })

  useEffect(() => { load() }, [id])

  // Mostrar advertencia de cierre de sesión cuando se sale sin finalizar
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Solo mostrar advertencia si hay ticket asignado, no cerrado Y no está guardando
      if (ticket && ticket.ha && !ticket.hc && !isSaving) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [ticket, isSaving])

  function load() { getTicket(id).then(setTicket).catch(console.error) }

  async function handleStart() {
    // Mostrar modal de credenciales antes de asignar
    setShowCredentialsModal(true)
  }

  async function handleCredentialsConfirm({ employee_input, password }) {
    setCredentialsBusy(true)
    try {
      // Verificar credenciales y obtener rol
      const data = await login(employee_input, password)
      
      // Roles que pueden atender tickets: admin, tecnico (mapeados desde The Goat, Ingeniero, Administrador, Calidad, Soporte, Lider)
      if (data.user.rol !== 'tecnico' && data.user.rol !== 'admin') {
        throw new Error('Solo Ingenieros, Administradores, Calidad, Soporte o Líderes pueden atender tickets')
      }
      
      // Si pasa la verificación, asignar el ticket al técnico que se autenticó
      // Guardar nombre y número de empleado del técnico
      await startTicket(id, data.user.nombre, data.user.num_empleado)
      
      setShowCredentialsModal(false)
      load()
    } catch (error) {
      console.error('Error:', error)
      throw error
    } finally {
      setCredentialsBusy(false)
    }
  }

  function handleEdit() { setEditMode(true) }

  function saveEdit() {
    updateTicket(id, form).then(() => { setEditMode(false); load() })
  }

  function handleBackWithoutFinish() {
    if (ticket && ticket.ha && !ticket.hc) {
      setShowLogoutWarning(true)
    } else {
      window.location.href = '/'
    }
  }

  function confirmLogoutAndReturn() {
    // Cerrar sesión y volver al login
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    window.location.href = '/'
  }

  async function handleFinish() {
    // Validar que todos los campos estén llenos
    if (!form.solucion || !form.rate) {
      alert('Por favor completa todos los campos antes de finalizar el ticket')
      return
    }

    // Now the backend will compute minutos (hc - hr) and derive piezas and deadtime.
    const rateNum = Number(form.rate) || 0
    try {
      setIsSaving(true) // Desactivar advertencia de salida
      await finishTicket(id, { solucion: form.solucion, rate: rateNum })
      // Pequeña pausa para asegurar que el backend procesó el cierre
      await new Promise(resolve => setTimeout(resolve, 300))
      window.location.href = '/'
    } catch (error) {
      console.error('Error al finalizar ticket:', error)
      setIsSaving(false) // Reactivar advertencia si hay error
      alert('Error al finalizar el ticket. Intenta de nuevo.')
    }
  }

  if (!ticket) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><span className="text-slate-300">Cargando...</span></div>

  return (
    <div className="min-h-screen bg-slate-900 p-3 sm:p-6">
      <div className="max-w-4xl mx-auto bg-slate-800 p-4 sm:p-6 rounded-lg shadow-lg border border-slate-700">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-slate-100">Manejar Ticket #{id}</h1>
          <button 
            onClick={handleBackWithoutFinish}
            className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg text-sm sm:text-base hover:bg-slate-600 transition-colors border border-slate-600"
          >
            ← Volver
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 text-sm sm:text-base">
          <p className="text-slate-300"><strong className="text-slate-100">Descripción:</strong> {ticket.descr}</p>
          <p className="text-slate-300"><strong className="text-slate-100">Línea:</strong> Línea {ticket.linea}</p>
          <p className="text-slate-300"><strong className="text-slate-100">Equipo:</strong> {ticket.equipo}</p>
          <p className="text-slate-300"><strong className="text-slate-100">Modelo:</strong> {ticket.modelo}</p>
          <p className="text-slate-300"><strong className="text-slate-100">Turno:</strong> {ticket.turno}</p>
        </div>

        {!ticket.ha && (
          <div className="mb-6">
            <button className="w-full sm:w-auto px-6 py-3 bg-blue-700/60 text-blue-100 rounded-lg text-sm sm:text-base font-medium hover:bg-blue-600/70 transition-colors border border-blue-600/50" onClick={handleStart}>Asignar Técnico</button>
          </div>
        )}

        {ticket.ha && (
          <div className="mt-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 text-slate-100">Información del Técnico</h2>
            <p className="text-sm text-amber-400 mb-4 bg-amber-900/20 border border-amber-700/30 rounded-lg p-3">⚠️ Debes completar todos los campos antes de salir de esta página</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <input 
                className={`border p-3 rounded-lg text-sm sm:text-base w-full transition-all ${form.rate ? 'bg-emerald-900/30 border-emerald-600/50 text-slate-200' : 'bg-slate-800 border-slate-600 text-slate-300'}`} 
                type="number" 
                placeholder="Rate (producción afectada) *" 
                value={form.rate} 
                onChange={e => setForm({...form, rate: e.target.value})} 
                required 
              />
            </div>
            <textarea 
              className={`border p-3 rounded-lg w-full mt-4 text-sm sm:text-base transition-all ${form.solucion ? 'bg-emerald-900/30 border-emerald-600/50 text-slate-200' : 'bg-slate-800 border-slate-600 text-slate-300'}`} 
              rows="4" 
              placeholder="Solución aplicada *" 
              value={form.solucion} 
              onChange={e => setForm({...form, solucion: e.target.value})} 
              required 
            />
            <button 
              className="mt-4 w-full sm:w-auto px-6 py-3 bg-rose-700/60 text-rose-100 rounded-lg text-sm sm:text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-rose-600/70 transition-colors border border-rose-600/50" 
              onClick={handleFinish} 
              disabled={!form.solucion || !form.rate}
            >
              Finalizar Ticket
            </button>
          </div>
        )}

        <LoginModal
          visible={showCredentialsModal}
          onClose={() => setShowCredentialsModal(false)}
          onConfirm={handleCredentialsConfirm}
          busy={credentialsBusy}
        />

        {/* Modal de advertencia de cierre de sesión */}
        {showLogoutWarning && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md shadow-2xl border border-slate-700">
              <h3 className="text-xl font-bold text-rose-400 mb-4">⚠️ Advertencia</h3>
              <p className="text-slate-300 mb-6">
                Has atendido este ticket pero no lo has finalizado. Por seguridad, debes iniciar sesión nuevamente para continuar.
              </p>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setShowLogoutWarning(false)}
                  className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors border border-slate-600"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmLogoutAndReturn}
                  className="px-4 py-2 bg-rose-700/60 text-rose-100 rounded-lg hover:bg-rose-600/70 transition-colors border border-rose-600/50"
                >
                  Cerrar Sesión y Volver
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}