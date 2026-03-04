import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getTicket, startTicket, updateTicket, finishTicket, login } from '../api_deadtimes'
import LoginModal from '../components/LoginModal'

// Helper para formatear fecha/hora
function formatDateTime(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return date.toLocaleString('es-MX', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function HandleTicket() {
  const { id } = useParams()
  const [ticket, setTicket] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [showCredentialsModal, setShowCredentialsModal] = useState(false)
  const [credentialsBusy, setCredentialsBusy] = useState(false)
  const [showLogoutWarning, setShowLogoutWarning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  // Rate ahora viene guardado en el ticket (tomado de tabla modelos al crear)
  const [form, setForm] = useState({ solucion: '' })

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

  // Limpiar modales al desmontar
  useEffect(() => {
    return () => {
      setShowCredentialsModal(false)
      setEditMode(false)
    }
  }, [])

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
      
      // REGLA DE NEGOCIO: Solo ciertos roles pueden atender tickets
      // Verificamos usando puedeAtender que viene del backend
      if (!data.user.puedeAtender) {
        throw new Error('No tienes permisos para cerrar tickets. Roles permitidos: Ingeniero, Técnico, AOI, Supervisor, Soporte, Mantenimiento, Calidad.')
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
    window.location.href = '/'
  }

  async function handleFinish() {
    // Validar que la solución esté llena
    if (!form.solucion) {
      alert('Por favor ingresa la solución aplicada antes de finalizar el ticket')
      return
    }

    // Validar que el ticket tenga rate guardado (viene de tabla modelos al crear)
    if (!ticket.rate) {
      alert('No se encontró el rate del modelo en el ticket. El ticket puede haber sido creado antes de la actualización.')
      return
    }

    // Rate viene del ticket (fue guardado al crearlo desde la tabla modelos)
    const rateNum = Number(ticket.rate) || 0
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

  if (!ticket) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-925 via-slate-900 to-slate-925 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-blue-400 mb-4"></div>
        <p className="text-slate-300 font-medium">Cargando ticket...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-925 via-slate-900 to-slate-925 p-3 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="glass-card rounded-2xl p-5 sm:p-8 shadow-2xl animate-slide-up">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">Manejar Ticket</h1>
                <span className="badge badge-amber">#{id}</span>
              </div>
            </div>
            <button 
              onClick={handleBackWithoutFinish}
              className="px-4 py-2.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 rounded-xl text-sm font-medium transition-all border border-slate-600/50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver
            </button>
          </div>
          
          {/* Información de tiempos */}
          <div className="mb-6 bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-slate-400">Creado:</span>
                <span className="text-white font-medium">{formatDateTime(ticket.hr) || 'N/A'}</span>
              </div>
              {ticket.ha && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-400">En atención:</span>
                  <span className="text-emerald-400 font-medium">{formatDateTime(ticket.ha)}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Información del ticket */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-slate-400 text-xs mb-1">Descripción</p>
              <p className="text-white font-medium">{ticket.descr}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-slate-400 text-xs mb-1">Línea</p>
              <p className="text-white font-medium">Línea {ticket.linea}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-slate-400 text-xs mb-1">Equipo</p>
              <p className="text-white font-medium">{ticket.equipo}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-slate-400 text-xs mb-1">Modelo</p>
              <p className="text-white font-medium">{ticket.modelo}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-slate-400 text-xs mb-1">Turno</p>
              <p className="text-white font-medium">{ticket.turno}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-slate-400 text-xs mb-1">Sección Afectada</p>
              <p className="text-white font-medium">{ticket.pa || 'N/A'}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-slate-400 text-xs mb-1">Condición de Paro</p>
              <p className="text-white font-medium">{ticket.pf || 'N/A'}</p>
            </div>
            {ticket.rate && (
              <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/30">
                <p className="text-blue-300 text-xs mb-1">Rate</p>
                <p className="text-blue-400 font-semibold flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {ticket.rate} piezas/hr
                </p>
              </div>
            )}
          </div>

          {/* Montadoras afectadas - Mostrar solo si es NXT */}
          {ticket.equipo === 'NXT' && (
            <div className="bg-cyan-500/10 rounded-xl p-5 border border-cyan-500/30 mb-6">
              <p className="text-xs text-cyan-300 mb-4 font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m7-12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Montadoras Afectadas
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                  <div key={i} className={`flex items-center justify-center py-2 px-3 rounded-lg text-sm font-medium ${
                    ticket[`mod${i}`] ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50' : 'bg-slate-700/30 text-slate-500 border border-slate-600/30'
                  }`}>
                    M{i}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botón asignar técnico */}
          {!ticket.ha && (
            <div className="mb-6">
              <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/30 mb-4">
                <p className="text-blue-300 text-sm flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Roles autorizados: <span className="font-semibold">Ingeniero, Técnico, AOI, Supervisor, Soporte, Mantenimiento</span>
                </p>
              </div>
              <button 
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 flex items-center justify-center gap-2" 
                onClick={handleStart}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Asignar Técnico
              </button>
            </div>
          )}

          {/* Formulario de solución */}
          {ticket.ha && (
            <div className="mt-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Información del Técnico
              </h2>
              
              <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/30 mb-4">
                <p className="text-amber-300 text-sm flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Debes completar la solución antes de salir de esta página
                </p>
              </div>
              
              {/* Rate del modelo */}
              <div className="mb-5 bg-blue-500/10 rounded-xl p-4 border border-blue-500/30">
                <p className="text-xs text-blue-300 mb-2 font-medium">Rate del modelo (automático)</p>
                {ticket.rate ? (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-blue-400 font-semibold">{ticket.rate} piezas/hr</span>
                  </div>
                ) : (
                  <p className="text-rose-400 text-sm">No se encontró rate. El ticket puede haber sido creado antes de la actualización.</p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm text-slate-300 mb-2 font-medium">Solución Aplicada *</label>
                <textarea 
                  className={`w-full bg-slate-800/50 border text-white p-4 rounded-xl transition-all focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${form.solucion ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-600/50'}`} 
                  rows="4" 
                  placeholder="Describe la solución aplicada..." 
                  value={form.solucion} 
                  onChange={e => setForm({...form, solucion: e.target.value})} 
                  required 
                />
              </div>

              <button 
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2" 
                onClick={handleFinish} 
                disabled={!form.solucion || !ticket.rate}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
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
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="glass-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-700/50 animate-slide-up">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white">Advertencia</h3>
                </div>
                <p className="text-slate-300 mb-6">
                  Has atendido este ticket pero no lo has finalizado. Por seguridad, debes iniciar sesión nuevamente para continuar.
                </p>
                <div className="flex gap-3 justify-end">
                  <button 
                    onClick={() => setShowLogoutWarning(false)}
                    className="px-4 py-2.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 rounded-xl font-medium transition-all border border-slate-600/50"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmLogoutAndReturn}
                    className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white rounded-xl font-medium transition-all shadow-lg shadow-rose-500/25"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}